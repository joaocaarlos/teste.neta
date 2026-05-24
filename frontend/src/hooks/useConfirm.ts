import { useCallback, useState } from "react";

interface ConfirmOptions {
  title: string;
  message: React.ReactNode;
  variant?: "default" | "danger";
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  resolve: (value: boolean) => void;
}

/**
 * useConfirm — substitui o window.confirm() nativo por um modal acessível.
 *
 * @example
 * const { confirm, dialog } = useConfirm();
 *
 * const onDelete = async () => {
 *   const ok = await confirm({
 *     title: 'Excluir esta máquina?',
 *     message: 'Esta ação não pode ser desfeita.',
 *     variant: 'danger',
 *     confirmLabel: 'Sim, excluir',
 *   });
 *   if (ok) doDelete();
 * };
 *
 * return <>
 *   <button onClick={onDelete}>Excluir</button>
 *   {dialog}
 * </>;
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ ...opts, open: true, resolve });
    });
  }, []);

  const handle = useCallback((value: boolean) => {
    state?.resolve(value);
    setState(null);
  }, [state]);

  return {
    confirm,
    state,
    onConfirm: () => handle(true),
    onCancel: () => handle(false),
  };
}
