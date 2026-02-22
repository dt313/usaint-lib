import type { Cheerio, CheerioAPI } from 'cheerio';
import type { SapWdaClient } from '../core/client';
import { SapEventQueue } from '../core/event-queue';
import type { SapEventResult } from '../core/types';

/**
 * Abstract base class for all SAP WDA UI controls.
 */
export abstract class SapControl {
    protected readonly $: CheerioAPI;
    protected readonly el: Cheerio<any>;
    protected readonly client: SapWdaClient;

    constructor(el: Cheerio<any>, client: SapWdaClient) {
        this.$ = client.$;
        this.el = el;
        this.client = client;
    }

    /**
     * The unique DOM ID of this control.
     */
    get id(): string {
        return this.el.attr('id') || '';
    }

    /**
     * The Control Type (ct) tag identifier.
     */
    get controlType(): string {
        return this.el.attr('ct') || '';
    }

    /**
     * Retrieves the parsed `lsdata` attribute parameters for this control.
     */
    get lsdata(): Record<string, any> {
        const raw = this.el.attr('lsdata');
        if (!raw) return {};
        return this.parseLsData(raw);
    }

    /**
     * Finds a child control by looking down the internal Cheerio DOM tree.
     * @param ct The Control Type identifier to search for.
     */
    findChildControl(ct: string): Cheerio<any> | null {
        const found = this.el.find(`[ct="${ct}"]`);
        return found.length > 0 ? found.first() : null;
    }

    /**
     * Dispatches an arbitrary event for this specific control via the client's queue.
     * @param eventName The SAP event name to trigger.
     * @param params Key-Value parameters to include in the event request.
     * @param focusInfo Specific focus coordinates required for rendering.
     * @returns A Promise resolving to the SapEventResult of the dispatch action.
     */
    protected async dispatchAction(eventName: string, params: Record<string, string>, focusInfo: string = ''): Promise<SapEventResult> {
        const queue = new SapEventQueue();

        queue.addEvent('ClientInspector_Notify', {
            Id: 'WD01',
            Data: 'CssMatchesHtmlVersion:TRUE'
        }, {
            ResponseData: 'delta', EnqueueCardinality: 'single'
        });

        queue.addEvent(eventName, { Id: this.id, ...params }, { ResponseData: 'delta', ClientAction: 'submit' });

        if (!focusInfo) {
            focusInfo = `@{"sFocussedId":"${this.id}"}`;
        }
        queue.addFormRequest(focusInfo);

        return await this.client.dispatchEvents(queue);
    }

    /**
     * Parses the proprietary SAP lsdata format into standard JSON objects.
     */
    private parseLsData(data: string): Record<string, any> {
        let str = data.trim();
        if (str.startsWith('{') && str.endsWith('}')) {
            try {
                str = str.replace(/'/g, '"')
                    .replace(/([\{,]\s*)([0-9a-zA-Z_]+)\s*:/g, '$1"$2":')
                    .replace(/\\x3a/ig, ':');
                return JSON.parse(str);
            } catch (e) {
                // Return an empty object if parsing fails on malformed data
            }
        }
        return {};
    }
}
