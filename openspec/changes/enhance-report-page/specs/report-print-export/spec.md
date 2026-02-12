## ADDED Requirements

### Requirement: Print Styles

The system SHALL provide optimized CSS styles for printing the report page.

#### Scenario: Navigation elements hidden

- **WHEN** the user prints the report (Ctrl+P / Cmd+P)
- **THEN** the table of contents sidebar SHALL be hidden
- **AND** the header actions (copy, download buttons) SHALL be hidden
- **AND** the reading progress bar SHALL be hidden

#### Scenario: Chart formatting

- **WHEN** the report is printed
- **THEN** mermaid charts SHALL be formatted to fit the page width
- **AND** charts SHALL NOT be split across pages
- **AND** charts SHALL maintain aspect ratio

#### Scenario: Typography for print

- **WHEN** the report is printed
- **AND** the text SHALL use a serif font for better readability
- **AND** heading hierarchy SHALL be clearly visible
- **AND** link URLs SHALL be displayed after links

### Requirement: Page Layout

The system SHALL format the report for proper page breaks.

#### Scenario: Heading page breaks

- **WHEN** the report is printed
- **THEN** h2 headings SHOULD start on a new page if there is insufficient space
- **AND** h3 headings SHALL NOT start on a new page

#### Scenario: Table formatting

- **WHEN** tables are printed
- **THEN** tables SHALL fit within page margins
- **AND** tables that overflow SHALL be scaled down
- **AND** table headers SHALL repeat on each page for long tables

#### Scenario: Section separation

- **WHEN** the report is printed
- **THEN** each major section (h2) SHALL have clear visual separation
- **AND** page numbers SHALL appear in the footer

### Requirement: PDF Export Button

The system SHALL provide a button to export the report as PDF.

#### Scenario: Export to PDF

- **WHEN** the user clicks the "Export PDF" button
- **THEN** the system SHALL open the print dialog with PDF as the selected output
- **AND** the PDF filename SHALL be: `[report-title]-[date].pdf`

#### Scenario: PDF metadata

- **WHEN** the PDF is generated
- **THEN** the PDF metadata SHALL include:
  - Title: Report title
  - Author: Application name
  - Subject: Project research report
