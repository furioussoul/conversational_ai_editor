'use client';

import {
  AllCommunityModule,
  ModuleRegistry,
  type CellValueChangedEvent,
  type ColDef,
  type ICellRendererParams,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Edit3, Plus, Trash2, Upload } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

import { Button } from '@/components/ui/button';
import type { Journey } from '@/lib/data/types';
import { cn } from '@/lib/utils';

ModuleRegistry.registerModules([AllCommunityModule]);

type SystemPromptRow = {
  id: string;
  journeyId: string | null;
  scene: string;
  orderType: string;
  orderStatus: string;
  condition: string;
  observation: string;
  response: string;
  title: string;
  description: string;
  triggers: string;
  colSpans?: { [key: string]: number };
  rowSpans?: { [key: string]: number };
};

type SystemPromptTableState = {
  version: 1;
  rows: SystemPromptRow[];
};

type GridContext = {
  onOpenJourney?: (journeyId: string | null) => void;
  onDeleteRow?: (rowId: string) => void;
};

type SystemPromptEditorProps = {
  value?: unknown;
  journeys: Journey[];
  onChange: (value: SystemPromptTableState) => void;
  onJourneyCellClick?: (journeyId: string | null) => void;
  className?: string;
};

export function SystemPromptEditor({
  value,
  journeys,
  onChange,
  onJourneyCellClick,
  className,
}: SystemPromptEditorProps) {
  const initialRows = useMemo(
    () => normalizeState(value, journeys),
    [value, journeys],
  );

  const [rows, setRows] = useState<SystemPromptRow[]>(initialRows);
  const gridRef = useRef<AgGridReact<SystemPromptRow>>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Defer the resetRowHeights call to allow the grid to re-render with new data first.
    const timer = setTimeout(() => {
      gridRef.current?.api.resetRowHeights();
    }, 0);

    const payload: SystemPromptTableState = {
      version: 1,
      rows: rows.map((row) => sanitizeRow(row)),
    };
    onChange(payload);

    return () => clearTimeout(timer);
  }, [rows, onChange]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Handle merged cells
      const merges = worksheet['!merges'] || [];
      const json: any[][] = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
      });

      merges.forEach((merge) => {
        const { s, e } = merge; // start, end
        const value = json[s.r][s.c];
        for (let r = s.r; r <= e.r; r++) {
          for (let c = s.c; c <= e.c; c++) {
            json[r][c] = value;
          }
        }
      });

      const newRows: SystemPromptRow[] = json
        .slice(1) // Assuming first row is header
        .map((row: any[]) => ({
          ...createEmptyRow(),
          id: generateId(),
          scene: row[0] ?? '',
          orderType: row[1] ?? '',
          orderStatus: row[2] ?? '',
          condition: row[3] ?? '',
          observation: row[4] ?? '',
          response: row[5] ?? '',
        }));

      setRows(newRows);
    };
    reader.readAsBinaryString(file);
  };

  const handleAddRow = useCallback(() => {
    setRows((prev) => [...prev, createEmptyRow()]);
  }, []);

  const handleDeleteRow = useCallback((rowId: string) => {
    setRows((prev) => {
      const filtered = prev.filter((row) => row.id !== rowId);
      return typeof structuredClone === 'function'
        ? structuredClone(filtered)
        : filtered.map((row) => ({ ...row }));
    });
  }, []);

  const handleOpenJourney = useCallback(
    (journeyId: string | null) => {
      onJourneyCellClick?.(journeyId);
    },
    [onJourneyCellClick],
  );

  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent<SystemPromptRow>) => {
      const updated = sanitizeRow(event.data);
      setRows((prev) =>
        prev.map((row) => (row.id === updated.id ? updated : row)),
      );
      gridRef.current?.api.resetRowHeights();
    },
    [],
  );

  const columnDefs = useMemo<ColDef<SystemPromptRow>[]>(
    () => [
      {
        field: 'scene',
        headerName: '场景',
        minWidth: 50,
      },
      {
        field: 'orderType',
        headerName: '订单类型',
        minWidth: 50,
      },
      {
        field: 'orderStatus',
        headerName: '订单状态',
        minWidth: 50,
      },
      {
        field: 'condition',
        headerName: '条件列表',
        minWidth: 50,
      },
      {
        field: 'observation',
        flex: 1.2,
        headerName: '观察事实',
        minWidth: 200,
      },
      {
        field: 'response',
        flex: 1.2,
        headerName: '优秀话术',
        minWidth: 200,
      },
      {
        headerName: '操作',
        colId: 'actions',
        cellRenderer: ActionCell,
        editable: false,
        sortable: false,
        filter: false,
        minWidth: 200,
        maxWidth: 220,
        pinned: 'right',
      },
    ],
    [],
  );

  const defaultColDef = useMemo<ColDef<SystemPromptRow>>(
    () => ({
      editable: true,
      resizable: true,
      flex: 1,
      minWidth: 160,
      sortable: false,
      filter: false,
      wrapText: true,
      autoHeight: true,
      cellClass: 'cell-wrap-text',
    }),
    [],
  );

  const gridContext = useMemo<GridContext>(
    () => ({
      onOpenJourney: handleOpenJourney,
      onDeleteRow: handleDeleteRow,
    }),
    [handleDeleteRow, handleOpenJourney],
  );

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              主流程表格
            </h3>
            <p className="text-sm text-slate-400">
              维护 Agent 的关键步骤与触发条件，支持直接编辑单元格。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleAddRow}
            >
              <Plus className="h-4 w-4" />
              添加行
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              上传 Excel
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
            />
          </div>
        </div>

        <div className="ag-theme-quartz-dark w-full rounded-lg border border-slate-800 bg-slate-950/60">
          <AgGridReact<SystemPromptRow>
            ref={gridRef}
            rowData={rows}
            columnDefs={columnDefs}
            // defaultColDef={defaultColDef}
            context={gridContext}
            domLayout="autoHeight"
            onCellValueChanged={handleCellValueChanged}
          />
        </div>
      </div>
    </div>
  );
}

function ActionCell({
  data,
  context,
}: ICellRendererParams<SystemPromptRow, unknown, GridContext>) {
  if (!data) return null;
  const gridContext = context ?? {};
  const label = data.journeyId ? '编辑流程' : '绑定流程';

  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-2"
        onClick={() => gridContext.onOpenJourney?.(data.id)}
      >
        <Edit3 className="h-4 w-4" />
        {label}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="删除行"
        onClick={() => gridContext.onDeleteRow?.(data.id)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function normalizeState(
  value: unknown,
  journeys: Journey[],
): SystemPromptRow[] {
  if (value && typeof value === 'object') {
    const state = value as Partial<SystemPromptTableState>;
    const maybeRows = Array.isArray(state.rows)
      ? state.rows
      : Array.isArray(value)
        ? value
        : null;
    if (maybeRows) {
      const sanitized = (maybeRows as unknown[]).map((row) => sanitizeRow(row));
      return sanitized.length
        ? ensureRowsCoverJourneys(sanitized, journeys)
        : fallbackRows(journeys);
    }

    const doc = value as { type?: string; content?: unknown };
    if (doc.type === 'doc') {
      const text = extractPlainText(doc);
      if (text) {
        return ensureRowsCoverJourneys(
          [
            {
              ...createEmptyRow(),
              id: generateId(),
              journeyId: null,
              title: '系统提示',
              description: text,
              triggers: '',
            },
          ],
          journeys,
        );
      }
    }
  }

  return fallbackRows(journeys);
}

function fallbackRows(journeys: Journey[]): SystemPromptRow[] {
  if (journeys.length) {
    return createRowsFromJourneys(journeys);
  }
  return [createEmptyRow()];
}

function createRowsFromJourneys(journeys: Journey[]): SystemPromptRow[] {
  return journeys.map((journey) => ({
    ...createEmptyRow(),
    id: generateId(),
    journeyId: journey.id,
    title: journey.title,
    description: journey.description ?? '',
    triggers: journey.triggerConditions.join(', '),
  }));
}

function ensureRowsCoverJourneys(
  rows: SystemPromptRow[],
  journeys: Journey[],
): SystemPromptRow[] {
  const journeyIds = new Set(
    rows.map((row) => row.journeyId).filter(Boolean) as string[],
  );
  let changed = false;
  let result = rows;

  journeys.forEach((journey) => {
    if (!journeyIds.has(journey.id)) {
      changed = true;
      result = [
        ...result,
        {
          ...createEmptyRow(),
          id: generateId(),
          journeyId: journey.id,
          title: journey.title,
          description: journey.description ?? '',
          triggers: journey.triggerConditions.join(', '),
        },
      ];
    }
  });

  return changed ? result : rows;
}

function sanitizeRow(input: unknown): SystemPromptRow {
  const candidate = (input ?? {}) as Partial<SystemPromptRow>;

  return {
    id:
      typeof candidate.id === 'string' && candidate.id.trim().length > 0
        ? candidate.id
        : generateId(),
    journeyId:
      typeof candidate.journeyId === 'string' &&
      candidate.journeyId.trim().length > 0
        ? candidate.journeyId
        : null,
    scene: typeof candidate.scene === 'string' ? candidate.scene : '',
    orderType:
      typeof candidate.orderType === 'string' ? candidate.orderType : '',
    orderStatus:
      typeof candidate.orderStatus === 'string' ? candidate.orderStatus : '',
    condition:
      typeof candidate.condition === 'string' ? candidate.condition : '',
    observation:
      typeof candidate.observation === 'string' ? candidate.observation : '',
    response: typeof candidate.response === 'string' ? candidate.response : '',
    title: typeof candidate.title === 'string' ? candidate.title : '',
    description:
      typeof candidate.description === 'string' ? candidate.description : '',
    triggers: typeof candidate.triggers === 'string' ? candidate.triggers : '',
  };
}

function createEmptyRow(): SystemPromptRow {
  return {
    id: generateId(),
    journeyId: null,
    scene: '',
    orderType: '',
    orderStatus: '',
    condition: '',
    observation: '',
    response: '',
    title: '',
    description: '',
    triggers: '',
  };
}

function extractPlainText(node: unknown): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) {
    return node.map((child) => extractPlainText(child)).join(' ');
  }
  if (typeof node === 'object') {
    const record = node as Record<string, unknown>;
    if (typeof record.text === 'string') {
      return record.text;
    }
    if (Array.isArray(record.content)) {
      return record.content.map((child) => extractPlainText(child)).join(' ');
    }
  }
  return '';
}

function generateId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}
