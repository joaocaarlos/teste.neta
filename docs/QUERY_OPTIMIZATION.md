# Query Optimization Guide — Eliminar N+1 Queries

## Problema

Quando você faz uma query que retorna N rows e depois faz uma query por row dentro de um loop, você tem N+1 queries totais.
