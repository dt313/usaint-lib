import { SapControl } from './SapControl';
import type { SapEventResult } from '../core/types';

export class SapInput extends SapControl {

    /**
     * Retrieves the current text representation of the input field.
     */
    public get value(): string {
        return this.el.attr('value') || '';
    }

    /**
     * Updates the input value and dispatches the corresponding SAP `InputField_Change` action.
     * @param text The new value to supply to the input.
     */
    public async setValue(text: string): Promise<SapEventResult> {
        return await this.dispatchAction('InputField_Change', {
            Value: text
        });
    }
}
