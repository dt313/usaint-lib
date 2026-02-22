import { SapControl } from './SapControl';
import type { SapEventResult } from '../core/types';

export class SapComboBox extends SapControl {

    /**
     * Retrieves the currently selected option key.
     */
    public get selectedKey(): string {
        const data = this.lsdata;
        return data['4']?.toString() ?? '';
    }

    /**
     * Retrieves the currently selected option display text.
     */
    public get selectedText(): string {
        const data = this.lsdata;
        return data['5']?.toString() ?? '';
    }

    /**
     * Extracts all available options from the associated ListBoxPopup (LIB_P).
     * Falls back to returning the single selected value from lsdata if the popup is not present in the DOM.
     *
     * @returns An array of key-text option pairs.
     */
    public getAvailableOptions(): { key: string, text: string }[] {
        const data = this.lsdata;
        const popupId = data['3']?.toString();

        if (popupId) {
            const popup = this.$(`[id="${popupId}"]`);
            if (popup.length) {
                const firstContainer = popup.find(`[id="${popupId}-first"]`);
                const container = firstContainer.length ? firstContainer : popup;

                const items = container.find('[ct="LIB_I"]');
                if (items.length > 0) {
                    const options: { key: string, text: string }[] = [];
                    items.each((_i: number, el: any) => {
                        const $el = this.$(el);
                        const key = $el.attr('data-itemkey') || '';
                        const text = $el.attr('data-itemvalue1') || $el.text().trim();
                        if (key) {
                            options.push({ key, text });
                        }
                    });
                    return options;
                }
            }
        }

        const options: { key: string, text: string }[] = [];
        if (data['4'] !== undefined && data['5'] !== undefined) {
            options.push({ key: data['4'].toString(), text: data['5'].toString() });
        }
        return options;
    }

    /**
     * Selects a given option by its identifying SAP Key.
     * Dispatches a `ComboBox_Select` sync call.
     * @param key The option key to select.
     */
    public async selectByKey(key: string): Promise<SapEventResult> {
        return await this.dispatchAction('ComboBox_Select', {
            Key: key,
            ByEnter: 'false'
        });
    }
}
