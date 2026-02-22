export interface SapEventParams {
    [key: string]: string | undefined;
}

/**
 * Manages the construction and serialization of the SAPEVENTQUEUE string.
 * Orchestrates event scheduling required for SAP WebDynpro POST requests.
 */
export class SapEventQueue {
    private events: string[] = [];

    /**
     * Adds an event to the processing queue.
     * @param eventName The name of the event (e.g., 'Button_Press', 'ComboBox_Select')
     * @param params Key-value pairs for the event parameters
     * @param controlParams Additional control parameters modifying the event behavior
     */
    addEvent(eventName: string, params: SapEventParams, controlParams?: SapEventParams): this {
        const serializedParams = this.serializeParams(params);
        let eventStr = `${eventName}~E002${serializedParams}~E003`;

        if (controlParams) {
            const serializedControlParams = this.serializeParams(controlParams);
            eventStr += `~E002${serializedControlParams}~E003`;
        } else {
            eventStr += `~E002~E003`;
        }

        eventStr += `~E002~E003`;

        this.events.push(eventStr);
        return this;
    }

    /**
     * Appends a standard Form_Request event, required for synchronizing component states.
     * @param focusInfo Interaction focus context
     */
    addFormRequest(focusInfo: string = ''): this {
        return this.addEvent(
            'Form_Request',
            {
                Id: 'sap.client.SsrClient.form',
                Async: 'false',
                FocusInfo: focusInfo,
                Hash: '',
                DomChanged: 'false',
                IsDirty: 'false'
            },
            {
                ResponseData: 'delta'
            }
        );
    }

    /**
     * Serializes the entire queue into the format required by the SAP POST endpoint.
     */
    serialize(): string {
        return this.events.join('~E001');
    }

    /**
     * Clears all events from the current queue.
     */
    clear(): void {
        this.events = [];
    }

    private serializeParams(params: SapEventParams): string {
        return Object.entries(params)
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => `${key}~E004${this.escapeValue(value as string)}`)
            .join('~E005');
    }

    /**
     * Escapes special characters within SAP event queues.
     */
    private escapeValue(value: string): string {
        return value.replace(/([^\w\-.])/g, (c) => {
            const hex = c.charCodeAt(0).toString(16).toUpperCase();
            const paddedHex = hex.length <= 2 ? hex.padStart(2, '0') : hex.padStart(4, '0');
            return `~00${paddedHex}`;
        });
    }
}
