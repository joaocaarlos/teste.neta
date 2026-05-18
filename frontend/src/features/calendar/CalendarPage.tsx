/**
 * CalendarPage — monthly availability calendar for machines.
 * Shows turn badges (morning/afternoon/night/allday) per day.
 * Inline styles only.
 */

import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Save, Calendar } from "lucide-react";
import { apiGetList, apiFetch } from "../../services/api";
import { EmptyState } from "../../components/ui/EmptyState";

// ─── Types ────────────────────────────────────────────────────────────────────

type TurnStatus = "available" | "booked" | "maintenance" | "blocked";
type Turn = "morning" | "afternoon" | "night" | "allday";

interface CalendarSlot {
  machine_id: string;
  year: number;
  month: number;
  day: number;
  turn: Turn;
  status: TurnStatus;
}

interface Machine {
  id: string;
  name: string;
  type: string;
}

// day → turn → status
type SlotMap = Record<number, Partial<Record<Turn, TurnStatus>>>;

// ─── Constants ────────────────────────────────────────────────────────────────

const TURNS: Turn[] = ["morning", "afternoon", "night", "allday"];

const TURN_LABELS: Record<Turn, string> = {
  morning: "M",
  afternoon: "T",
  night: "N",
  allday: "D",
};

const TURN_TITLES: Record<Turn, string> = {
  morning: "Manhã",
  afternoon: "Tarde",
  night: "Noite",
  allday: "Dia todo",
};

const STATUS_COLORS: Record<TurnStatus, { bg: string; color: string }> = {
  available: { bg: "rgba(34,197,94,0.18)", color: "var(--green)" },
  booked: { bg: "rgba(249,115,22,0.18)", color: "var(--orange)" },
  maintenance: { bg: "rgba(239,68,68,0.18)", color: "var(--red)" },
  blocked: { bg: "rgba(100,100,110,0.25)", color: "var(--white3)" },
};

const DAY_NAMES = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Monday=0 offset for the 1st of month */
function firstDayOffset(year: number, month: number): number {
  const day = new Date(year, month - 1, 1).getDay(); // 0=Sun
  return (day + 6) % 7; // shift so Mon=0
}

function toggleStatus(current: TurnStatus | undefined): TurnStatus {
  if (!current || current === "blocked") return "available";
  if (current === "available") return "blocked";
  return current; // booked/maintenance not toggleable by user
}

// ─── TurnBadge ────────────────────────────────────────────────────────────────

function TurnBadge({
  turn,
  status,
  onClick,
}: {
  turn: Turn;
  status: TurnStatus | undefined;
  onClick?: () => void;
}) {
  if (!status) return null;
  const colors = STATUS_COLORS[status];
  const canToggle = status === "available" || status === "blocked";

  return (
    <button
      title={`${TURN_TITLES[turn]}: ${status}`}
      onClick={onClick}
      disabled={!canToggle}
      style={{
        background: colors.bg,
        color: colors.color,
        border: `1px solid ${colors.color}`,
        borderRadius: 3,
        padding: "1px 5px",
        fontSize: 9,
        fontFamily: "var(--mono)",
        fontWeight: 700,
        cursor: canToggle ? "pointer" : "default",
        letterSpacing: ".04em",
        lineHeight: 1.5,
      }}
    >
      {TURN_LABELS[turn]}
    </button>
  );
}

// ─── DayCell ─────────────────────────────────────────────────────────────────

function DayCell({
  day,
  slots,
  isToday,
  onToggle,
}: {
  day: number;
  slots: Partial<Record<Turn, TurnStatus>>;
  isToday: boolean;
  onToggle: (turn: Turn) => void;
}) {
  return (
    <div
      style={{
        background: "var(--bg2)",
        border: isToday ? "1px solid var(--amber)" : "1px solid var(--border)",
        padding: "6px 8px",
        minHeight: 72,
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontFamily: "var(--mono)",
          color: isToday ? "var(--amber)" : "var(--white3)",
          fontWeight: isToday ? 700 : 400,
          lineHeight: 1,
        }}
      >
        {day}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
        {TURNS.filter((t) => slots[t]).map((turn) => (
          <TurnBadge
            key={turn}
            turn={turn}
            status={slots[turn]}
            onClick={() => onToggle(turn)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── CalendarPage ─────────────────────────────────────────────────────────────

export function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string>("");

  const [slotMap, setSlotMap] = useState<SlotMap>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Load machines once
  useEffect(() => {
    apiGetList<Machine>("/v1/machines").then((list) => {
      setMachines(list);
      if (list.length > 0 && !selectedMachineId) {
        setSelectedMachineId(list[0].id);
      }
    });
  }, []);

  // Load calendar slots when machine/month/year changes
  useEffect(() => {
    if (!selectedMachineId) return;
    setLoading(true);
    setDirty(false);

    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
      machine_id: selectedMachineId,
    });

    apiGetList<CalendarSlot>(`/v1/calendar?${params}`)
      .then((slots) => {
        const map: SlotMap = {};
        slots.forEach((s) => {
          if (!map[s.day]) map[s.day] = {};
          map[s.day][s.turn] = s.status;
        });
        setSlotMap(map);
      })
      .finally(() => setLoading(false));
  }, [selectedMachineId, year, month]);

  const handleToggle = useCallback(
    (day: number, turn: Turn) => {
      setSlotMap((prev) => {
        const daySlots = { ...(prev[day] ?? {}) };
        daySlots[turn] = toggleStatus(daySlots[turn]);
        return { ...prev, [day]: daySlots };
      });
      setDirty(true);
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!selectedMachineId) return;
    setSaving(true);
    try {
      const slots: CalendarSlot[] = [];
      Object.entries(slotMap).forEach(([dayStr, turns]) => {
        const day = Number(dayStr);
        Object.entries(turns ?? {}).forEach(([turn, status]) => {
          if (status) {
            slots.push({
              machine_id: selectedMachineId,
              year,
              month,
              day,
              turn: turn as Turn,
              status,
            });
          }
        });
      });

      const res = await apiFetch("/v1/calendar", {
        method: "POST",
        body: JSON.stringify({ slots }),
      });
      if (!res.ok) throw new Error("Erro ao salvar calendário");
      setDirty(false);
    } catch {
      // ignore; could toast here
    } finally {
      setSaving(false);
    }
  }, [selectedMachineId, slotMap, year, month]);

  const prevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  // Build calendar grid
  const totalDays = daysInMonth(year, month);
  const offset = firstDayOffset(year, month);
  const cells: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const todayDay =
    today.getFullYear() === year && today.getMonth() + 1 === month
      ? today.getDate()
      : -1;

  return (
    <div
      style={{
        padding: "28px 32px",
        maxWidth: 1100,
        margin: "0 auto",
        fontFamily: "var(--body)",
      }}
    >
      {/* Page header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--cond)",
              fontSize: 28,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: ".04em",
              color: "var(--white)",
              margin: 0,
            }}
          >
            Calendário
          </h1>
          <p style={{ fontSize: 13, color: "var(--white3)", marginTop: 4 }}>
            Disponibilidade de máquinas por turno
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {/* Machine selector */}
          {machines.length > 0 && (
            <select
              value={selectedMachineId}
              onChange={(e) => setSelectedMachineId(e.target.value)}
              style={{
                background: "var(--bg3)",
                border: "1px solid var(--border2)",
                color: "var(--white)",
                fontFamily: "var(--body)",
                fontSize: 13,
                padding: "8px 12px",
                cursor: "pointer",
                minWidth: 160,
              }}
            >
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              background: dirty ? "var(--amber)" : "var(--bg3)",
              border: dirty ? "none" : "1px solid var(--border2)",
              color: dirty ? "var(--bg)" : "var(--white3)",
              fontFamily: "var(--cond)",
              fontWeight: 700,
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: ".06em",
              cursor: saving || !dirty ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
              transition: "background .2s, color .2s",
            }}
          >
            <Save size={14} />
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>

      {/* No machines */}
      {machines.length === 0 && !loading && (
        <EmptyState
          icon={<Calendar size={40} />}
          title="Nenhuma máquina cadastrada"
          message="Cadastre uma máquina na página de Máquinas para gerenciar disponibilidade."
        />
      )}

      {machines.length > 0 && (
        <>
          {/* Month navigation */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <button
              onClick={prevMonth}
              style={{
                background: "transparent",
                border: "1px solid var(--border2)",
                color: "var(--white)",
                cursor: "pointer",
                padding: "6px 10px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <ChevronLeft size={16} />
            </button>

            <div
              style={{
                fontFamily: "var(--cond)",
                fontSize: 18,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: ".06em",
                color: "var(--white)",
                minWidth: 160,
                textAlign: "center",
              }}
            >
              {MONTH_NAMES[month - 1]} {year}
            </div>

            <button
              onClick={nextMonth}
              style={{
                background: "transparent",
                border: "1px solid var(--border2)",
                color: "var(--white)",
                cursor: "pointer",
                padding: "6px 10px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Legend */}
          <div
            style={{
              display: "flex",
              gap: 12,
              marginBottom: 12,
              flexWrap: "wrap",
            }}
          >
            {(Object.entries(STATUS_COLORS) as [TurnStatus, { bg: string; color: string }][]).map(
              ([status, colors]) => (
                <div
                  key={status}
                  style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      background: colors.bg,
                      border: `1px solid ${colors.color}`,
                      borderRadius: 2,
                    }}
                  />
                  <span style={{ color: "var(--white3)", fontFamily: "var(--mono)" }}>
                    {status}
                  </span>
                </div>
              )
            )}
            <div style={{ fontSize: 11, color: "var(--white3)", fontFamily: "var(--mono)", marginLeft: 8 }}>
              M=Manhã · T=Tarde · N=Noite · D=Dia todo
            </div>
          </div>

          {/* Day names row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 4,
              marginBottom: 4,
            }}
          >
            {DAY_NAMES.map((d) => (
              <div
                key={d}
                style={{
                  textAlign: "center",
                  fontSize: 10,
                  fontFamily: "var(--cond)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  color: "var(--white3)",
                  padding: "4px 0",
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          {loading ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 4,
              }}
            >
              {Array.from({ length: 35 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 72,
                    background: "var(--bg2)",
                    border: "1px solid var(--border)",
                    opacity: 0.4,
                  }}
                />
              ))}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 4,
              }}
            >
              {cells.map((day, i) =>
                day === null ? (
                  <div
                    key={`empty-${i}`}
                    style={{
                      background: "transparent",
                      minHeight: 72,
                    }}
                  />
                ) : (
                  <DayCell
                    key={day}
                    day={day}
                    slots={slotMap[day] ?? {}}
                    isToday={day === todayDay}
                    onToggle={(turn) => handleToggle(day, turn)}
                  />
                )
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default CalendarPage;
