import { SapControl } from './SapControl';
import type { SapEventResult } from '../core/types';

export interface SapTableCellData {
    /** The plain text extracted from the cell */
    text: string;
    /** List of interactive controls found within the cell */
    controls: SapControl[];
}

/**
 * Cell data structure for a single table row.
 */
export interface SapTableRowData {
    /** 0-based index within the visible chunk. */
    index: number;
    /** Cell values containing text and embedded controls in column order. */
    cells: SapTableCellData[];
}

/**
 * Result of reading visible (rendered) table cells.
 */
export interface SapTableVisibleData {
    /** Column header texts (selection column excluded). */
    headers: string[];
    /** Rendered data rows. */
    rows: SapTableRowData[];
}

export class SapTable extends SapControl {

    /**
     * Computes the total number of data rows within the virtual table (excluding headers).
     */
    public getTotalRowCount(): number {
        const ariaRows = this.el.attr('aria-rowcount');
        if (ariaRows) {
            return Math.max(0, parseInt(ariaRows, 10) - 1);
        }
        const ls = this.lsdata;
        if (ls['2'] !== undefined) return parseInt(String(ls['2']), 10);
        return 0;
    }

    /**
     * Computes the total number of data columns within the virtual table (excluding selection UI).
     */
    public getTotalColumnCount(): number {
        const ariaCols = this.el.attr('aria-colcount');
        if (ariaCols) {
            return Math.max(0, parseInt(ariaCols, 10) - 1);
        }
        const ls = this.lsdata;
        if (ls['3'] !== undefined) return parseInt(String(ls['3']), 10);
        return 0;
    }

    /**
     * Checks whether the table has a selection column rendered.
     */
    public hasSelectionColumn(): boolean {
        let hasSelCol = false;
        this.el.find('th').each((_i: number, th: any) => {
            const lsd = this.$(th).attr('lsdata') || '';
            if (lsd.includes('SELECTIONCOLUMN')) {
                hasSelCol = true;
            }
        });
        return hasSelCol;
    }

    /**
     * Extracts column header texts from the table headers, handling ID deduplication.
     *
     * @returns An array of header text strings in display order.
     */
    public getHeaders(): string[] {
        const headers: string[] = [];
        const seen = new Set<string>();

        this.el.find('th').each((_i: number, th: any) => {
            const $th = this.$(th);

            const lsd = $th.attr('lsdata') || '';
            if (lsd.includes('SELECTIONCOLUMN')) return;

            const text = $th.text().trim();
            const id = $th.attr('id') || '';

            if (id && seen.has(id)) return;
            if (id) seen.add(id);

            if (text) {
                headers.push(text);
            }
        });

        return headers;
    }

    /**
     * Scrapes all rendered (visible) cells and headers present within the current DOM slice.
     *
     * @returns A structured data object composed of the available headers and row elements.
     */
    public getVisibleRows(): SapTableVisibleData {
        const headers = this.getHeaders();
        const hasSel = this.hasSelectionColumn();

        const trs = this.el.find('[id$="-contentTBody"]').find('tr[rr]');
        const rows: SapTableRowData[] = [];

        trs.each((i: number, tr: any) => {
            const $tr = this.$(tr);
            const tds = $tr.find('td');
            const cells: SapTableCellData[] = [];

            tds.each((j: number, td: any) => {
                if (hasSel && j === 0) return;

                const $td = this.$(td);
                const text = $td.text().trim().replace(/\s+/g, ' ');

                // Find all SAP controls within this cell
                const controls: SapControl[] = [];
                const controlElements = $td.find('[ct]');

                controlElements.each((_, controlEl) => {
                    const id = this.$(controlEl).attr('id');
                    if (id) {
                        const control = this.client.getControlById(id);
                        if (control) {
                            controls.push(control);
                        }
                    }
                });

                cells.push({ text, controls });
            });

            rows.push({ index: i, cells });
        });

        return { headers, rows };
    }

    /**
     * Aggregates complete table data iteratively advancing the DOM scroll window to span all total entries.
     *
     * @returns Complete representation of Headers and aggregated data rows from the viewport.
     */
    public async getAllRows(): Promise<SapTableVisibleData> {
        const headers = this.getHeaders();
        const totalRows = this.getTotalRowCount();
        const allRows: SapTableRowData[] = [];

        if (totalRows === 0) {
            return { headers, rows: allRows };
        }

        let visible = this.getVisibleRows();
        for (const row of visible.rows) {
            allRows.push({ index: allRows.length, cells: row.cells });
        }

        while (allRows.length < totalRows) {
            const nextIndex = allRows.length + 1;
            await this.scrollVertical(nextIndex);

            // Re-fetch table từ updated DOM rồi gọi getVisibleRows trên instance mới
            const freshTable = this.client.getControlById<SapTable>(this.id);
            if (!freshTable) break;

            visible = freshTable.getVisibleRows();
            if (visible.rows.length === 0) break;

            const prevSize = allRows.length;
            for (const row of visible.rows) {
                if (allRows.length >= totalRows) break;
                allRows.push({ index: allRows.length, cells: row.cells });
            }

            if (allRows.length === prevSize) break;
        }

        return { headers, rows: allRows };
    }

    /**
     * Advances the active table virtualization block by providing a specific starting data pointer.
     * @param firstVisibleIndex The absolute item index targeted to enter viewport.
     */
    public async scrollVertical(firstVisibleIndex: number): Promise<SapEventResult> {
        return await this.dispatchAction('SapTable_VerticalScroll', {
            FirstVisibleItemIndex: firstVisibleIndex.toString(),
            Action: 'DIRECT',
            AccessType: 'SCROLLBAR',
            SelectionFollowFocus: 'false',
            Shift: 'false',
            Ctrl: 'false',
            Alt: 'false'
        });
    }

    /**
     * Performs a SAP table cell selection action.
     * Handles DOM navigation and focus parameter construction.
     *
     * @param absoluteRowIndex Absolute, 0-based data row index.
     * @param colIndex 0-based data column index.
     * @param specificCellId Direct identifier explicitly targeting a Cell ID.
     */
    public async selectCell(absoluteRowIndex: number, colIndex: number, specificCellId?: string): Promise<SapEventResult> {
        const hasSel = this.hasSelectionColumn();

        if (!specificCellId) {
            const targetRr = (absoluteRowIndex + 1).toString();

            let liveTable = this.client.$(`[id="${this.id}"]`);
            let existingRow = liveTable.find('[id$="-contentTBody"]').find(`tr[rr="${targetRr}"]`);

            if (existingRow.length === 0) {
                await this.scrollVertical(absoluteRowIndex);

                liveTable = this.client.$(`[id="${this.id}"]`);
                existingRow = liveTable.find('[id$="-contentTBody"]').find(`tr[rr="${targetRr}"]`);
            }

            if (existingRow.length === 0) {
                existingRow = liveTable.find('[id$="-contentTBody"]').find(`tr[rr]`).first();
                if (existingRow.length === 0) {
                    throw new Error(`[SapTable] Could not resolve absolute row ${absoluteRowIndex} for cell select. Table is empty.`);
                }
            }

            const tds = existingRow.find('td');
            const tdIndex = hasSel ? colIndex + 1 : colIndex;
            specificCellId = this.client.$(tds.get(tdIndex)!).attr('id') || '';

            const rrVal = existingRow.attr('rr');
            const sapRowIndex = rrVal ? rrVal : targetRr;

            const ccAttr = this.client.$(tds.get(tdIndex)!).attr('cc');
            const sapColIndex = ccAttr ? parseInt(ccAttr, 10) + 1 : colIndex + 1;

            let focussedId = specificCellId;
            if (specificCellId.includes('.')) {
                focussedId = specificCellId.replace(/\.([^\.]+)$/, '_EDITOR.$1');
            } else {
                focussedId = specificCellId + '_EDITOR';
            }

            const focusInfo = `@{"iRowIndex":${sapRowIndex},"iColIndex":${sapColIndex},"sFocussedId":"${focussedId}","sApplyControlId":"${this.id}"}`;

            return await this.dispatchAction('SapTable_CellSelect', {
                CellId: specificCellId,
                CellType: 'SapTableCell',
                RowIndex: sapRowIndex,
                ColIndex: sapColIndex.toString(),
                RowUserData: '',
                CellUserData: '',
                AccessType: 'STANDARD'
            }, focusInfo);

        } else {
            const sapColIndex = colIndex + 1;
            let focussedId = specificCellId;
            if (specificCellId.includes('.')) {
                focussedId = specificCellId.replace(/\.([^\.]+)$/, '_EDITOR.$1');
            } else {
                focussedId = specificCellId + '_EDITOR';
            }

            const sapRowIndex = (absoluteRowIndex + 1).toString();

            const focusInfo = `@{"iRowIndex":${sapRowIndex},"iColIndex":${sapColIndex},"sFocussedId":"${focussedId}","sApplyControlId":"${this.id}"}`;

            return await this.dispatchAction('SapTable_CellSelect', {
                CellId: specificCellId,
                CellType: 'SapTableCell',
                RowIndex: sapRowIndex,
                ColIndex: sapColIndex.toString(),
                RowUserData: '',
                CellUserData: '',
                AccessType: 'STANDARD'
            }, focusInfo);
        }
    }

    /**
     * Resolves the DOM ID of a targeted structural data cell element.
     *
     * @param rowIndex 0-based DOM row index amongst viewport rows.
     * @param colIndex 0-based data column index.
     * @returns Character matching identifying the matched subset.
     */
    private resolveCellId(rowIndex: number, colIndex: number): string {
        const trs = this.el.find('[id$="-contentTBody"]').find('tr[rr]');
        if (rowIndex < 0 || rowIndex >= trs.length) return '';

        const row = trs.eq(rowIndex);
        const tds = row.find('td');
        const hasSel = this.hasSelectionColumn();
        const tdIndex = hasSel ? colIndex + 1 : colIndex;
        if (tdIndex < 0 || tdIndex >= tds.length) return '';

        return this.$(tds.get(tdIndex)!).attr('id') || '';
    }

    /**
     * Assesses total structural rendered subsets strictly.
     * @returns Extracted count index representation.
     */
    public getRenderedRowCount(): number {
        const trs = this.el.find('[id$="-contentTBody"]').find('tr[rr]');
        return trs.length;
    }

    /**
     * Retrieves visible node structure data representing text cells sequentially.
     */
    public getCellText(rowIndex: number, colIndex: number): string | null {
        const trs = this.el.find('[id$="-contentTBody"]').find('tr[rr]');
        if (rowIndex < 0 || rowIndex >= trs.length) return null;

        const row = trs.eq(rowIndex);
        const tds = row.find('td');
        const hasSel = this.hasSelectionColumn();
        const tdIndex = hasSel ? colIndex + 1 : colIndex;
        if (tdIndex < 0 || tdIndex >= tds.length) return null;

        const cell = tds.eq(tdIndex);
        return cell.text().trim().replace(/\s+/g, ' ') || null;
    }
}
