import {SapButton, SapComboBox, SapTable} from './src/controls';
import {SapSsoClient, SapWdaClient} from './src/index';

export const chapel = async (studentId: string, studentPassword: string) => {
    const ssoClient = new SapSsoClient();
    const cookies = await ssoClient.login(studentId, studentPassword);

    // 1. Initialize Client
    const client = new SapWdaClient('https://ecc.ssu.ac.kr', 'ZCMW3681', cookies);

    try {
        await client.initialize();

        await client.getControlById<SapComboBox>('ZCMW3681.ID_0001:V_MAIN.TC_SEL_PERYR')?.selectByKey("2024");
        await client.getControlById<SapComboBox>('ZCMW3681.ID_0001:V_MAIN.TC_SEL_PERID')?.selectByKey("092");

        await client.getControlById<SapButton>('ZCMW3681.ID_0001:V_MAIN.BTN_SEL')?.press();

        {
            const table = client.getControlById<SapTable>('ZCMW3681.ID_0001:V_MAIN.TABLE_A');
            if (table) {
                console.log(`\nTable Found!`);
                console.log(`  Total Rows: ${table.getTotalRowCount()}`);
                console.log(`  Total Columns: ${table.getTotalColumnCount()}`);
                console.log(`  Rendered Rows: ${table.getRenderedRowCount()}`);

                const headers = table.getHeaders();
                console.log(`  Headers: ${headers.join(' | ')}`);

                console.log(`\n  Fetching all rows via scroll...`);
                const allData = await table.getAllRows();
                console.log(`  Collected ${allData.rows.length} / ${table.getTotalRowCount()} rows`);
                for (const row of allData.rows) {
                    console.log(`    [${row.index}]: ${row.cells.map(c => c.text).join(' | ')}`);
                }
            }
        }

        {
            const table = client.getControlById<SapTable>('ZCMW3681.ID_0001:V_MAIN.TABLE02_CP_CP');
            if (table) {
                console.log(`\nTable Found!`);
                console.log(`  Total Rows: ${table.getTotalRowCount()}`);
                console.log(`  Total Columns: ${table.getTotalColumnCount()}`);
                console.log(`  Rendered Rows: ${table.getRenderedRowCount()}`);

                const headers = table.getHeaders();
                console.log(`  Headers: ${headers.join(' | ')}`);

                console.log(`\n  Fetching all rows via scroll...`);
                const allData = await table.getAllRows();
                console.log(`  Collected ${allData.rows.length} / ${table.getTotalRowCount()} rows`);
                for (const row of allData.rows) {
                    console.log(`    [${row.index}]: ${row.cells.map(c => c.text).join(' | ')}`);
                }
            }
        }

        console.log("\nExample complete!");

    } catch (e) {
        console.error("Simulation error:", e);
    }
};
