/**
 * Utility to parse SAP WDA's proprietary `lsdata` attribute format into a standardized JSON record.
 * @param lsdataString The raw string encoded by SAP WDA parameters.
 * @returns The transformed JSON object representing `lsdata`.
 */
export function parseLsData(lsdataString: string | null | undefined): Record<string, any> {
    if (!lsdataString) return {};
    let data = lsdataString.trim();
    if (data.startsWith('{') && data.endsWith('}')) {
        try {
            let validJson = data
                .replace(/'/g, '"')
                .replace(/([\{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
                .replace(/\\x3a/ig, ':');

            return JSON.parse(validJson);
        } catch (e) {
            return {};
        }
    }
    return {};
}
