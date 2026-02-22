import { SapControl } from './SapControl';
import type { SapEventResult } from '../core/types';

export class SapButton extends SapControl {
    /**
     * Simulates a button press action and explicitly syncs with the SAP backend.
     * Triggers the `Button_Press` client request mapping.
     */
    public async press(): Promise<SapEventResult> {
        return await this.dispatchAction('Button_Press', {});
    }

    /**
     * Gets the visible text label of the button.
     */
    public get text(): string {
        return this.el.text().trim();
    }
}
