# usaint-lib

Light u-SAINT library written in Typescript.

## Installation

```bash
npm install usaint-lib
# or
yarn add usaint-lib
# or
pnpm add usaint-lib
```

## Setup & Build

```bash
pnpm install
pnpm run build
```

## License

MIT License

## API Reference

### `SapSsoClient`

Manages the authentication process required for a successful connection.

- `login(studentId, password)`: Performs u-SAINT SSO login and returns the session cookies.

### `SapWdaClient`

Handles communication and data exchange with the SAP WDA application.

- `new SapWdaClient(url, appName, cookies)`: Initializes the client using the target URL, App Name, and authentication cookies.
- `initialize()`: Initializes the application and establishes a session.
- `getControlById<T>(id)`: Retrieves a control object (e.g., `SapButton`, `SapTable`) using the ID of the UI element.

### SAP Controls

Use the retrieved control objects to interact with screen elements.

- **`SapButton`**
  - `press()`: Simulates a button click.
- **`SapInput`**
  - `value`: Gets or sets the value of the input field.
- **`SapComboBox`**
  - `selectByKey(key)`: Selects a dropdown item by its key.
- **`SapTable`**
  - `getTotalRowCount()`, `getTotalColumnCount()`: Gets the total number of rows and columns in the table.
  - `getRenderedRowCount()`: Gets the number of rows currently rendered on the screen.
  - `getHeaders()`: Returns an array containing the text of the component headers.
  - `getAllRows()`: Retrieves all data (rows) from the table, including virtualized data not immediately visible, by simulating scrolling operations. Within each row's `cells`, you can access the text (`cell.text`) or any nested controls, such as buttons (`cell.controls`).
  - `selectCell(rowIndex, colIndex)`: Selects a specific cell based on its row and column indices.
