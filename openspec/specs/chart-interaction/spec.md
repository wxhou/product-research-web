## ADDED Requirements

### Requirement: Chart Modal Display

The system SHALL display charts in a modal overlay when the user clicks on a chart.

#### Scenario: Click to open modal

- **WHEN** the user clicks on a rendered mermaid chart
- **THEN** a modal overlay SHALL appear
- **AND** the chart SHALL be displayed at a larger size
- **AND** the modal SHALL have a close button in the top-right corner
- **AND** clicking outside the chart SHALL close the modal

#### Scenario: Keyboard navigation

- **WHEN** the modal is open
- **THEN** pressing the Escape key SHALL close the modal
- **AND** pressing Tab SHALL cycle through interactive elements

### Requirement: Chart Download

The system SHALL allow users to download charts as image files.

#### Scenario: Download as PNG

- **WHEN** the user clicks the download button in the chart modal
- **THEN** the system SHALL generate a PNG image of the chart
- **AND** the image SHALL be downloaded with filename format: `[report-title]-[chart-id].png`
- **AND** the image resolution SHALL be 2x for better quality

#### Scenario: Download fallback for SVG

- **WHEN** the chart cannot be converted to PNG
- **THEN** the system SHALL offer to download the original SVG
- **AND** the SVG download SHALL use filename format: `[report-title]-[chart-id].svg`

### Requirement: Chart Error Handling

The system SHALL gracefully handle chart rendering failures.

#### Scenario: Render failure display

- **WHEN** mermaid.js fails to render a chart
- **THEN** the system SHALL display an error state instead of raw mermaid code
- **AND** the error state SHALL include: error message, chart source code, retry button

#### Scenario: Retry rendering

- **WHEN** the user clicks the retry button on a failed chart
- **THEN** the system SHALL attempt to re-render the chart
- **AND** if successful, the rendered chart SHALL replace the error state

#### Scenario: Manual chart editing

- **WHEN** the chart error state is displayed
- **THEN** the user SHALL be able to view and copy the raw mermaid code
- **AND** the user SHALL be able to edit the code and attempt to re-render
