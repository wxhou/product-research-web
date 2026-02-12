## ADDED Requirements

### Requirement: Table of Contents Display

The system SHALL display a table of contents sidebar on the right side of the report page when the report contains more than 3 headings.

#### Scenario: TOC appears for long reports

- **WHEN** the report has 4 or more h2/h3 headings
- **THEN** the table of contents sidebar SHALL be visible
- **AND** the sidebar SHALL be fixed to the right side of the viewport
- **AND** the sidebar SHALL display all h2 headings with indentation for h3 children

#### Scenario: TOC shows current position indicator

- **WHEN** the user scrolls and a heading enters the viewport
- **THEN** the corresponding TOC entry SHALL be highlighted
- **AND** the highlight SHALL move smoothly to follow the reading position
- **AND** the active heading SHALL have a different background color

#### Scenario: TOC navigation

- **WHEN** the user clicks on a TOC entry
- **THEN** the page SHALL scroll smoothly to the corresponding heading
- **AND** the heading SHALL have an id attribute for anchor linking

### Requirement: Reading Progress Bar

The system SHALL display a reading progress bar at the top of the report page.

#### Scenario: Progress bar visible

- **WHEN** the report page is loaded
- **THEN** a thin progress bar SHALL be visible at the top of the viewport
- **AND** the progress bar SHALL show the reading progress as a percentage

#### Scenario: Progress updates on scroll

- **WHEN** the user scrolls through the report
- **THEN** the progress bar SHALL update in real-time
- **AND** the progress SHALL be calculated as: (scrollY / (documentHeight - viewportHeight)) * 100

#### Scenario: Progress completion

- **WHEN** the user reaches the bottom of the report
- **THEN** the progress bar SHALL display 100%
- **AND** the progress bar color SHALL change to indicate completion

### Requirement: Breadcrumb Navigation

The system SHALL display breadcrumb navigation at the top of the report page.

#### Scenario: Breadcrumb shows hierarchy

- **WHEN** the report page is loaded
- **THEN** the breadcrumb SHALL show: Home > Projects > [Project Title] > [Report]
- **AND** each item SHALL be a clickable link

#### Scenario: Quick section jump

- **WHEN** the user hovers over the report section of the breadcrumb
- **THEN** a dropdown SHALL appear with all top-level sections
- **AND** clicking a section SHALL scroll to that section

### Requirement: Empty State Display

The system SHALL display an enhanced empty state when no report is available.

#### Scenario: Empty state with illustration

- **WHEN** the user navigates to a non-existent or deleted report
- **THEN** an empty state UI SHALL be displayed with:
  - An illustration icon
  - A descriptive message
  - A call-to-action button to navigate back

#### Scenario: Empty state guidance

- **WHEN** the empty state is displayed
- **THEN** the message SHALL guide users to create a new report
- **AND** the call-to-action button SHALL link to the projects page
