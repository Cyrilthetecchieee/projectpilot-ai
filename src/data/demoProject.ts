import type { Project } from '../types'

const requirements = [
  ['FR-01', 'System shall detect whether the helmet is being worn.', 'Functional', 'High', 'Validated'],
  ['FR-02', 'System shall verify whether the helmet strap is secured.', 'Functional', 'High', 'Validated'],
  ['FR-03', 'Vehicle start authorization shall only be issued after required safety conditions are satisfied.', 'Functional', 'Critical', 'Validated'],
  ['FR-04', 'System shall detect sensor disconnection within 500ms.', 'Functional', 'High', 'Needs review'],
  ['FR-05', 'System shall communicate verified status to the vehicle controller.', 'Functional', 'High', 'Validated'],
  ['FR-06', 'System shall record authorization decisions for diagnostics.', 'Functional', 'Medium', 'Draft'],
  ['NFR-01', 'Safety-critical state changes must be detected reliably.', 'Non-functional', 'Critical', 'Validated'],
  ['NFR-02', 'Communication failure must not create an unsafe authorization state.', 'Non-functional', 'Critical', 'Validated'],
  ['NFR-03', 'The system shall operate for 8 hours on a single battery charge.', 'Non-functional', 'Medium', 'Needs review'],
  ['NFR-04', 'Status updates shall be delivered with less than 200ms latency.', 'Non-functional', 'High', 'Draft'],
  ['NFR-05', 'Firmware shall support field diagnostics without unsafe state changes.', 'Non-functional', 'Medium', 'Draft'],
  ['NFR-06', 'The enclosure shall withstand normal outdoor riding conditions.', 'Non-functional', 'Low', 'Needs review'],
].map(([id, text, kind, priority, status]) => ({ id, text, kind: kind as 'Functional' | 'Non-functional', priority: priority as any, status: status as 'Validated' | 'Needs review' | 'Draft' }))

const tasks = [
  ['T-01', 'Confirm safety states and authorization rules', 'Requirements & Design', 'Critical', 'Completed', 'Stable state model documented.'],
  ['T-02', 'Select strap sensor', 'Requirements & Design', 'High', 'Completed', 'Sensor selection recorded with rationale.'],
  ['T-03', 'Define communication protocol', 'Requirements & Design', 'High', 'In Progress', 'Message schema reviewed by firmware and vehicle teams.'],
  ['T-04', 'Document fallback states', 'Requirements & Design', 'High', 'Pending', 'VALID, INVALID, DISCONNECTED and UNKNOWN are explicit.'],
  ['T-05', 'Order presence sensors', 'Hardware Prototype', 'Medium', 'Completed', 'Prototype components available.'],
  ['T-06', 'Assemble helmet prototype', 'Hardware Prototype', 'High', 'In Progress', 'Physical assembly passes inspection.'],
  ['T-07', 'Validate sensor wiring', 'Hardware Prototype', 'Medium', 'Pending', 'Wiring continuity verified.'],
  ['T-08', 'Implement strap sensor reading', 'Firmware Development', 'High', 'In Progress', 'Stable binary reading for 20 consecutive tests.'],
  ['T-09', 'Implement debounce logic', 'Firmware Development', 'Medium', 'Pending', 'False transitions reduced below target.'],
  ['T-10', 'Implement disconnected state', 'Firmware Development', 'Critical', 'Pending', 'Disconnect detected within 500ms.'],
  ['T-11', 'Build controller message handler', 'Firmware Development', 'High', 'Pending', 'Valid messages update controller state.'],
  ['T-12', 'Add authorization gate', 'System Integration', 'Critical', 'Completed', 'Unsafe states cannot authorize start.'],
  ['T-13', 'Connect helmet to controller', 'System Integration', 'High', 'Pending', 'End-to-end message exchange succeeds.'],
  ['T-14', 'Add diagnostic event logging', 'System Integration', 'Medium', 'Pending', 'Events are queryable with timestamps.'],
  ['T-15', 'Run environmental checks', 'Validation', 'Medium', 'Pending', 'Outdoor conditions do not corrupt state.'],
  ['T-16', 'Run communication loss test', 'Validation', 'High', 'Pending', 'Authorization denied on link loss.'],
  ['T-17', 'Run battery endurance test', 'Validation', 'Low', 'Pending', 'Eight-hour target met.'],
  ['T-18', 'Review safety acceptance criteria', 'Validation', 'High', 'Completed', 'Acceptance checklist signed off.'],
  ['T-19', 'Prepare demo build', 'Validation', 'Low', 'Pending', 'Demo flow is repeatable.'],
].map(([id, title, milestone, priority, status, successCriteria]) => ({ id, title, milestone, priority: priority as any, status: status as any, successCriteria }))

export const demoProject: Project = {
  id: 'smart-helmet', name: 'Smart Helmet Safety System', idea: 'A connected helmet that prevents vehicle authorization unless helmet presence and strap safety conditions are verified.', objective: 'Create a reliable safety interlock between a rider helmet and a vehicle controller.', type: 'IoT / Embedded', technologies: ['ESP32', 'BLE', 'C++', 'React'], constraints: 'Limited hardware access, four-week timeline, student budget.', timeline: '2–3 Months', stage: 'Planning', completion: 42,
  requirements, architecture: [
    { id: 'ac-01', name: 'Helmet Presence Sensor', status: 'Active', responsibility: 'Detect whether the helmet is being worn.', inputs: ['Pressure signal'], outputs: ['Presence state'] },
    { id: 'ac-02', name: 'Strap Sensor', status: 'Active', responsibility: 'Verify strap closure and detect disconnects.', inputs: ['Switch signal'], outputs: ['Strap state'] },
    { id: 'ac-03', name: 'Helmet Microcontroller', status: 'Active', responsibility: 'Collect and validate helmet safety states.', inputs: ['Helmet presence', 'Strap state'], outputs: ['Verified helmet status'] },
    { id: 'ac-04', name: 'Wireless Communication', status: 'Needs decision', responsibility: 'Transport signed status messages to the vehicle.', inputs: ['Verified status'], outputs: ['Controller message'] },
    { id: 'ac-05', name: 'Vehicle Controller', status: 'Active', responsibility: 'Evaluate authorization state before startup.', inputs: ['Controller message'], outputs: ['Authorization decision'] },
    { id: 'ac-06', name: 'Start Authorization', status: 'Active', responsibility: 'Gate vehicle start based on safe state.', inputs: ['Authorization decision'], outputs: ['Start enabled or denied'] },
  ], tasks, risks: [
    { id: 'r-01', title: 'Sensor failure behavior undefined', severity: 'Critical', detail: 'A disconnected strap sensor could produce an invalid state. The current design does not specify whether this should prevent authorization or trigger a fault state.', recommendation: 'Define explicit states: VALID, INVALID, DISCONNECTED, UNKNOWN.', resolved: false },
    { id: 'r-02', title: 'Communication-loss handling missing', severity: 'High', detail: 'The controller needs a deterministic response when messages stop arriving.', recommendation: 'Add a timeout and deny authorization until a valid state returns.', resolved: false },
    { id: 'r-03', title: 'No defined sensor calibration procedure', severity: 'Medium', detail: 'Sensor thresholds may drift between hardware builds.', recommendation: 'Document a repeatable calibration sequence.', resolved: false },
    { id: 'r-04', title: 'Dashboard logging format not specified', severity: 'Low', detail: 'Diagnostics will be hard to compare without a stable event schema.', recommendation: 'Define timestamped event names and payload fields.', resolved: false },
  ], tests: [
    ['TC-01', 'Helmet not worn', 'Presence sensor is open', 'Authorization denied', 'Passed'], ['TC-02', 'Helmet worn, strap open', 'Presence is valid; strap is open', 'Authorization denied', 'Passed'], ['TC-03', 'Valid helmet + strap', 'Both safety signals are valid', 'Authorization allowed', 'Pending'], ['TC-04', 'Strap sensor disconnected', 'Sensor cable is removed', 'System enters safe fault state', 'Pending'], ['TC-05', 'Communication lost', 'Controller receives no status', 'Vehicle authorization denied', 'Pending'], ['TC-06', 'Invalid sensor values', 'Sensor reports out-of-range value', 'Unknown state cannot authorize', 'Passed'], ['TC-07', 'Power cycle recovery', 'System restarts from safe state', 'Authorization remains denied', 'Passed'], ['TC-08', 'Repeated strap transitions', 'Strap is toggled rapidly', 'Debounce prevents false state', 'Pending'], ['TC-09', 'Low battery warning', 'Battery reaches threshold', 'Diagnostic event is recorded', 'Passed'], ['TC-10', 'Controller timeout', 'Heartbeat expires', 'Authorization is revoked', 'Pending'], ['TC-11', 'Outdoor temperature', 'System operates outdoors', 'State remains reliable', 'Pending'], ['TC-12', 'Diagnostic export', 'Events exist in memory', 'Export has stable schema', 'Pending'], ['TC-13', 'Reconnect after loss', 'Link is restored', 'Valid state re-evaluated', 'Pending'], ['TC-14', 'Firmware upgrade', 'New firmware installed', 'Safety defaults remain intact', 'Pending'],
  ].map(([id, scenario, precondition, expected, status]) => ({ id, scenario, precondition, expected, status: status as any })),
  activity: [
    { id: 'a-01', agent: 'Requirement Agent', action: 'Analyzed project requirements', status: 'Completed', duration: '1.8s', createdAt: 'Today, 09:42' }, { id: 'a-02', agent: 'Architecture Agent', action: 'Generated system architecture', status: 'Completed', duration: '2.4s', createdAt: 'Today, 09:44' }, { id: 'a-03', agent: 'Planner Agent', action: 'Updated execution plan', status: 'Completed', duration: '1.4s', createdAt: 'Today, 09:45' }, { id: 'a-04', agent: 'Reviewer Agent', action: 'Detected 4 engineering gaps', status: 'Completed', duration: '3.1s', createdAt: 'Today, 09:48' }, { id: 'a-05', agent: 'Test Agent', action: 'Generated test cases', status: 'Completed', duration: '2.1s', createdAt: 'Today, 09:49' },
  ], nextAction: { title: 'Define sensor failure and fallback states', description: 'The current design depends on strap verification but does not define system behavior when the sensor disconnects or returns invalid readings.', priority: 'High', effort: '30–45 min', criteria: ['Disconnected sensor can be detected', 'Invalid sensor values do not trigger a valid state', 'Safe fallback behavior is documented'] },
}
