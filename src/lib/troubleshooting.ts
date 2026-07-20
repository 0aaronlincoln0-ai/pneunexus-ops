export type DiagnosticCategory =
  | "Carrier movement"
  | "Station"
  | "Diverter"
  | "Blower"
  | "Controls & network"
  | "Safety & contamination";

export type RiskLevel = "routine" | "caution" | "restricted";

export interface DiagnosticStep {
  title: string;
  instruction: string;
  expected: string;
  ifAbnormal: string;
  role?: "operator" | "technician" | "it" | "infection-control";
  requiresShutdown?: boolean;
}

export interface TroubleshootingGuide {
  id: string;
  title: string;
  faultNames: string[];
  category: DiagnosticCategory;
  deviceTypes: string[];
  risk: RiskLevel;
  summary: string;
  symptoms: string[];
  likelyCauses: string[];
  safety: string[];
  tools: string[];
  steps: DiagnosticStep[];
  verification: string[];
  escalateWhen: string[];
  sourceSection: string;
}

export const troubleshootingGuides: TroubleshootingGuide[] = [
  {
    id: "station-position-failure",
    title: "Station will not make position",
    faultNames: ["Unit position failure", "Station position timeout"],
    category: "Station",
    deviceTypes: ["Station"],
    risk: "caution",
    summary:
      "Separate a blocked mechanism or trapped carrier from a switch, brake, motor, or command-state problem.",
    symptoms: [
      "Dispatcher or slide plate position remains unknown",
      "Position command times out",
      "Station signs off during a transaction",
      "Position indicators remain inactive",
    ],
    likelyCauses: [
      "Carrier trapped between dispatcher and slide plate",
      "Carrier or debris behind the dispatcher triggering the full-bin sensor",
      "Sticking motor brake or mechanism overshooting a position switch",
      "Failed fuse, motor, position switch, wiring, or control output",
    ],
    safety: [
      "Do not move either mechanism when carrier sensors indicate an obstruction.",
      "Isolate electrical power before opening the station or manually releasing a brake.",
      "Keep hands clear of the dispatcher, slide plate, cam arms, and pinch points.",
    ],
    tools: ["Station detail view", "Approved mirror or inspection camera", "Site LOTO equipment"],
    steps: [
      {
        title: "Confirm the reported position",
        instruction:
          "Review the station's position indicators and identify the requested versus reported dispatcher and slide-plate states.",
        expected: "Exactly one valid position is reported for each mechanism.",
        ifAbnormal:
          "If all position indicators are inactive, treat the mechanism as position-unknown and continue with an obstruction check.",
      },
      {
        title: "Check transaction ownership",
        instruction:
          "Determine whether the station is still reserved by an active or stopped transaction. Record the transaction number and last carrier sighting.",
        expected: "The diagnostic case has a known transaction state and last sighting.",
        ifAbnormal:
          "Do not issue commands until transaction ownership is resolved by an authorized technician.",
      },
      {
        title: "Check for a trapped carrier",
        instruction:
          "Compare carrier-sensor and latch states with the dispatcher and slide-plate states. Inspect the opening without reaching into the mechanism.",
        expected: "No carrier or foreign object is trapped between moving parts.",
        ifAbnormal:
          "Stop here, isolate power, and use the site-approved trapped-carrier recovery procedure.",
        requiresShutdown: true,
      },
      {
        title: "Exercise positions under observation",
        instruction:
          "Only after the path is confirmed clear, have an authorized technician test dispatch, half-gate, receive, drop, and return-to-receive while observing position feedback.",
        expected:
          "Each movement stops cleanly and its position indication changes once without flicker.",
        ifAbnormal:
          "Inspect the motor brake, cam linkage, switch alignment, fuse, motor, and wiring with power isolated.",
        role: "technician",
      },
    ],
    verification: [
      "Run an unloaded self-send and confirm lift, return, and gentle landing.",
      "Confirm the position fault remains cleared after at least two complete cycles.",
      "Document the failed component or adjustment in the work order.",
    ],
    escalateWhen: [
      "A carrier is pinched or cannot be recovered without disassembly.",
      "The mechanism binds, overshoots, or moves with power removed.",
      "Electrical testing or motor replacement is required.",
    ],
    sourceSection: "Faults troubleshooting: station unit position failure",
  },
  {
    id: "diverter-position-failure",
    title: "Diverter position unknown or carrier jammed",
    faultNames: ["Unit position failure", "Device failed to hold position"],
    category: "Diverter",
    deviceTypes: ["Diverter"],
    risk: "restricted",
    summary:
      "Determine whether the fault is caused by a carrier in a port, misalignment, brake/fuse failure, or a position sensor problem.",
    symptoms: [
      "All port indicators are inactive",
      "Diverter reaches a port and drifts past it",
      "Carrier sighting remains active at the diverter",
      "Alignment tool will not pass through the indexed port",
    ],
    likelyCauses: [
      "Carrier lodged between transition tube and port",
      "Actuator or limit switch out of alignment",
      "Loose chain, worn seal, brake, fuse, or motor problem",
      "Carrier sensor blocked, dirty, or electrically unstable",
    ],
    safety: [
      "Never rotate a position-unknown diverter until a trapped carrier has been ruled out.",
      "Apply lockout/tagout before touching the chain, gatling plate, cam arms, or transition tube.",
      "Port alignment must be verified using the approved electronic procedure and alignment tool.",
    ],
    tools: [
      "Diverter detail and alignment views",
      "Approved alignment tool",
      "Site LOTO equipment",
    ],
    steps: [
      {
        title: "Read port and carrier states",
        instruction:
          "Capture current port indicators, carrier-sensor state, transaction ownership, and the last confirmed carrier sighting.",
        expected:
          "One port is confirmed and the carrier sensor is clear when no carrier is present.",
        ifAbnormal:
          "If all ports are inactive or the carrier sensor is active, do not rotate the diverter yet.",
      },
      {
        title: "Establish a controlled airflow path",
        instruction:
          "An authorized technician may align the documented blower path and observe whether controlled vacuum produces a carrier sighting.",
        expected:
          "The sensor changes state and the carrier moves toward a designated recovery station.",
        ifAbnormal: "Stop remote recovery attempts and dispatch an on-site technician.",
        role: "technician",
      },
      {
        title: "Inspect the mechanism with power isolated",
        instruction:
          "Check the transition tube, ports, sensor sleeve, seals, chain, actuators, limit switches, and motor-brake circuit.",
        expected: "No carrier or debris is present and the mechanism is intact and aligned.",
        ifAbnormal:
          "Photograph and document the condition before carrier recovery, adjustment, or component replacement.",
        requiresShutdown: true,
      },
      {
        title: "Verify every indexed port",
        instruction:
          "After repair, electronically move to each port and confirm mechanical alignment and stable position feedback.",
        expected: "Every port aligns without binding and remains in position.",
        ifAbnormal: "Remove the diverter from service and escalate for alignment or drive repair.",
        role: "technician",
      },
    ],
    verification: [
      "Run an empty carrier through each affected path.",
      "Confirm stable port indication and clean carrier-sensor set/clear behavior.",
      "Inspect seals and chain condition before returning the diverter to service.",
    ],
    escalateWhen: [
      "Transition-tube removal or carrier extraction is required.",
      "The brake-release circuit, fuse, motor, chain, or actuator requires repair.",
      "A port cannot be aligned electronically and mechanically.",
    ],
    sourceSection: "Faults troubleshooting: diverter unit position failure",
  },
  {
    id: "blower-position-airflow",
    title: "Blower position or airflow failure",
    faultNames: ["Unit position failure", "Air flow error sensor"],
    category: "Blower",
    deviceTypes: ["Blower", "Air shifter"],
    risk: "restricted",
    summary:
      "Confirm air-shifter position, airflow feedback, and the electrical/mechanical condition of the blower package.",
    symptoms: [
      "Vacuum or pressure command times out",
      "Airflow is not detected in an active phase",
      "Carrier lift is weak across multiple stations in one zone",
      "Air shifter does not report idle, vacuum, or pressure position",
    ],
    likelyCauses: [
      "Air-shifter position switch or seal problem",
      "Blocked, split, or disconnected sampling tube",
      "Blower starter, motor, phase, or control-circuit failure",
      "Major air leak at a station, diverter, or system pipe",
    ],
    safety: [
      "Blower packages may contain 208/480 VAC three-phase power; electrical access is restricted to qualified personnel.",
      "Do not run the blower against an unknown obstruction or open mechanical assembly.",
      "Apply the site's electrical and mechanical lockout procedure before opening the package.",
    ],
    tools: [
      "Blower detail view",
      "Approved airflow/pressure instrument",
      "Qualified electrical support",
    ],
    steps: [
      {
        title: "Define the scope",
        instruction:
          "Compare failures across stations in the affected zone to determine whether the issue is local to one endpoint or common to the blower path.",
        expected: "The failure boundary is known: endpoint, path, or complete zone.",
        ifAbnormal:
          "Collect two controlled self-send results from different stations before proceeding.",
      },
      {
        title: "Review air-shifter feedback",
        instruction:
          "Observe idle, vacuum, and pressure position feedback without opening the package.",
        expected: "Each commanded state has one stable matching position indication.",
        ifAbnormal: "Inspect position switches, drive components, and seals under lockout.",
      },
      {
        title: "Compare airflow command to feedback",
        instruction:
          "Confirm that airflow feedback changes only when the blower is running and correctly aligned.",
        expected: "Vacuum and pressure feedback agree with the active phase.",
        ifAbnormal:
          "Check the sampling tube and sensor circuit before concluding that the three-phase blower has failed.",
        role: "technician",
      },
      {
        title: "Qualified electrical and mechanical inspection",
        instruction:
          "Under lockout, inspect the starter, overload condition, motor rotation, air-shifter seals, chain, ports, and sampling tube.",
        expected:
          "Electrical protection is reset only after the cause is identified and mechanical airflow paths are intact.",
        ifAbnormal:
          "Keep the zone unavailable and escalate to qualified electrical or vendor support.",
        requiresShutdown: true,
        role: "technician",
      },
    ],
    verification: [
      "Confirm stable idle, vacuum, and pressure indications.",
      "Run weighted and unweighted self-sends from representative stations.",
      "Verify expected travel times and gentle carrier arrival.",
    ],
    escalateWhen: [
      "Three-phase electrical testing or starter work is required.",
      "The blower rotates incorrectly, trips protection, overheats, or produces abnormal sound.",
      "Airflow remains inadequate after endpoint leaks and sampling-tube issues are ruled out.",
    ],
    sourceSection: "Mechanical details and blower position troubleshooting",
  },
  {
    id: "missing-carrier",
    title: "Missing or stuck carrier",
    faultNames: ["Carrier missing", "Cannot advance", "Travel time exceeded"],
    category: "Carrier movement",
    deviceTypes: ["Carrier", "Station", "Diverter"],
    risk: "restricted",
    summary:
      "Use the transaction timeline and sensor sightings to narrow the carrier to a path segment before any recovery attempt.",
    symptoms: [
      "Transaction bar is stopped",
      "Expected turnaround or destination sighting never occurred",
      "Automated search completed without a sighting",
      "Carrier was removed or was too heavy to lift",
    ],
    likelyCauses: [
      "Carrier never left the sending station",
      "Overweight, open, damaged, or badly worn carrier",
      "Carrier lodged in a station, diverter, brake, or tube segment",
      "Dirty, failed, or intermittent carrier sensor",
      "Weak airflow or inaccurate route-length configuration",
    ],
    safety: [
      "Treat the carrier contents as unknown; follow hospital handling and infection-control policy.",
      "Do not use impact carriers or improvised ramming procedures through the guided application.",
      "Keep people clear of the recovery station before any authorized airflow recovery attempt.",
    ],
    tools: ["Transaction timeline", "On/off sighting history", "System path map", "Carrier scale"],
    steps: [
      {
        title: "Preserve transaction evidence",
        instruction:
          "Record the origin, destination, carrier identifier if available, phase, path, last ON/OFF sighting, and automated search result.",
        expected: "A specific last-known device and path segment are identified.",
        ifAbnormal: "Do not guess a location; reconcile sensor and transaction history first.",
      },
      {
        title: "Rule out failure to launch",
        instruction:
          "Inspect the origin for the carrier and review whether the origin was the only sensor sighting. Check weight, closure, and carrier condition.",
        expected: "The carrier either remains at origin or has a confirmed downstream sighting.",
        ifAbnormal:
          "Treat an origin-only sighting as a lift/handling problem before searching downstream pipe.",
      },
      {
        title: "Inspect the last-known endpoint",
        instruction:
          "Check the station or diverter at the last sighting for a blocked sensor, trapped carrier, full bin, or position fault.",
        expected: "The endpoint and its sensors are clear and positions are known.",
        ifAbnormal:
          "Follow the device-specific obstruction guide and isolate power before mechanical access.",
      },
      {
        title: "Escalate a confirmed pipe obstruction",
        instruction:
          "If controlled search and endpoint checks do not produce a sighting, mark the suspected tube segment unavailable and dispatch the approved recovery team.",
        expected:
          "The affected path is isolated and alternative routes or downtime procedures are active.",
        ifAbnormal:
          "Escalate operational impact to hospital leadership and the tube-system vendor.",
        role: "technician",
      },
    ],
    verification: [
      "Account for the carrier and contents under hospital chain-of-custody policy.",
      "Run an empty self-send through the complete affected path.",
      "Confirm clean sensor transitions and travel time within the expected range.",
    ],
    escalateWhen: [
      "Carrier contents may be hazardous, urgent, temperature-sensitive, or security controlled.",
      "The carrier location cannot be narrowed to a device or pipe segment.",
      "Mechanical disassembly, ceiling access, or impact recovery would be required.",
    ],
    sourceSection: "Carrier missing, transaction search, and purge-search theory",
  },
  {
    id: "station-communications",
    title: "Station communications failure",
    faultNames: ["Com failure", "Lost communication to server", "Not receiving messages"],
    category: "Controls & network",
    deviceTypes: ["Station", "Touchscreen", "Network"],
    risk: "caution",
    summary:
      "Work from the station hardware toward the control center, separating touchscreen, PRIO, configuration, cabling, and hospital-network causes.",
    symptoms: [
      "Station is unreachable from the control center",
      "Touchscreen reports lost server communication",
      "Device status has not updated",
      "Ping or poll test fails",
    ],
    likelyCauses: [
      "Station or touchscreen has no power or failed to boot",
      "Touchscreen-to-controller link is disconnected",
      "Incorrect station ID, control-center address, subnet, gateway, or DHCP lease",
      "Hospital switch port, VLAN, cable, or network policy problem",
      "Control center has not re-established the station session after reboot",
    ],
    safety: [
      "Do not expose IP addresses or network configuration to users without sensitive-infrastructure permission.",
      "Coordinate switch-port, VLAN, DHCP, and packet testing with hospital IT.",
      "Power cycling is permitted only under the facility's operational-change procedure.",
    ],
    tools: [
      "Station event log",
      "Ping status",
      "Link indicators",
      "Hospital-approved cable tester",
    ],
    steps: [
      {
        title: "Confirm local boot and power",
        instruction:
          "Verify the touchscreen completes its normal boot sequence and the controller is powered. Record any displayed error message.",
        expected: "The station application loads and local hardware status is visible.",
        ifAbnormal: "Follow the touchscreen boot guide before investigating the network.",
      },
      {
        title: "Verify local controller communication",
        instruction:
          "Use local diagnostics to confirm commands, sensors, and position inputs update between the touchscreen and device controller.",
        expected: "Local hardware status updates even if the control center is unavailable.",
        ifAbnormal:
          "Inspect the touchscreen-to-controller data cable, controller power, and local logs.",
      },
      {
        title: "Validate network identity",
        instruction:
          "Compare station ID and network settings with the approved site record. A self-assigned 169.254.x.x address indicates DHCP failure unless intentionally configured for service.",
        expected: "Address, subnet, gateway, and control-center endpoint match the site design.",
        ifAbnormal:
          "Correct only through approved configuration management; do not copy settings from another campus.",
        role: "it",
      },
      {
        title: "Trace communications toward the server",
        instruction:
          "Check physical link, ping, expected poll messages, inbound status messages, and bidirectional state changes in that order.",
        expected: "The failed layer is isolated to device, cable, network, or application session.",
        ifAbnormal:
          "Provide timestamps, MAC/IP, switch location, and test results to hospital IT or vendor support.",
        role: "it",
      },
    ],
    verification: [
      "Station status remains current for at least five polling intervals.",
      "A local carrier-count change is reflected at the control center and vice versa.",
      "Complete an unloaded self-send after operational control is restored.",
    ],
    escalateWhen: [
      "Touchscreen storage or hardware appears to have failed.",
      "Network testing requires switch, firewall, VLAN, or server changes.",
      "The station repeatedly disconnects after successful recovery.",
    ],
    sourceSection: "Station communication fault and touchscreen communications troubleshooting",
  },
  {
    id: "controller-communications",
    title: "Device controller communications failure",
    faultNames: ["PRIO Com failure", "Controller offline", "Hardware unavailable"],
    category: "Controls & network",
    deviceTypes: ["PRIO controller", "Station", "Diverter", "Blower"],
    risk: "caution",
    summary:
      "Separate controller power, local data-link, configuration mode, cable, and upstream network faults before replacing hardware.",
    symptoms: [
      "Touchscreen cannot read or move station hardware",
      "Controller status is absent while the touchscreen is running",
      "Controller LED indicates service or maintenance mode",
      "Device is intentionally offline after a DIP-setting change",
    ],
    likelyCauses: [
      "Controller has no low-voltage power or a protection device has opened",
      "Touchscreen-to-controller data cable is loose or damaged",
      "Service, capture, brake-release, or test mode was left enabled",
      "Controller address or network configuration is incorrect",
      "Controller hardware or firmware has failed",
    ],
    safety: [
      "Record all switch positions before changing them and restore the approved run configuration afterward.",
      "Never use a metal object to operate small configuration switches.",
      "Power down before changing a switch state when required by the approved controller procedure.",
    ],
    tools: ["Controller LED reference", "Approved wiring diagram", "Known-good data cable"],
    steps: [
      {
        title: "Capture the present controller state",
        instruction:
          "Record power indicators, LED color/flash pattern, switch-bank positions, local error messages, and the last known configuration change.",
        expected: "The controller indicates the correct device type and normal run mode.",
        ifAbnormal: "Compare the state with the approved, revision-matched controller reference.",
      },
      {
        title: "Verify power and local link",
        instruction:
          "Confirm approved supply power and inspect the local data connection between the touchscreen or device interface and controller.",
        expected: "Controller power is stable and local data indicators show activity.",
        ifAbnormal: "Isolate power before inspecting fuses, connectors, or field wiring.",
        requiresShutdown: true,
      },
      {
        title: "Exit unintended service modes",
        instruction:
          "An authorized technician compares switch settings with the device-type baseline and corrects only documented deviations using the required power-down sequence.",
        expected: "The controller returns to normal run mode and the correct device identity.",
        ifAbnormal:
          "Do not trial switch combinations; escalate with the board revision and captured state.",
        role: "technician",
      },
      {
        title: "Prove bidirectional control status",
        instruction:
          "Confirm that local inputs update upstream and that an authorized, safe test command produces the expected local output and feedback.",
        expected: "Status and permitted commands traverse the full control path.",
        ifAbnormal:
          "Isolate the failure to controller, local interface, network, or control-center configuration.",
      },
    ],
    verification: [
      "Controller remains in normal run mode after a full power cycle.",
      "All position and carrier sensors update without flicker.",
      "The device remains online for at least five polling intervals and completes a safe functional test.",
    ],
    escalateWhen: [
      "The board revision or approved baseline configuration is unknown.",
      "Protection opens again after replacement or reset.",
      "Controller programming, firmware, or board replacement is required.",
    ],
    sourceSection: "PRIO board operation, DIP settings, LED states, and communications",
  },
  {
    id: "sensor-anomaly",
    title: "Carrier sensor is blocked, flickering, or out of sequence",
    faultNames: [
      "Cannot clear carrier sensor",
      "Sensor sighting at inactive device",
      "Floater detected",
    ],
    category: "Carrier movement",
    deviceTypes: ["Carrier sensor", "Station", "Diverter"],
    risk: "caution",
    summary:
      "Determine whether a sighting represents a real carrier, debris, optical contamination, unstable power/wiring, or an unrelated carrier in the system.",
    symptoms: [
      "Sensor remains active after the carrier should have cleared",
      "Inactive device reports a carrier sighting",
      "Sighting appears outside the expected transaction path",
      "Sensor state flickers without a visible obstruction",
    ],
    likelyCauses: [
      "Carrier or debris physically blocks the sensing point",
      "Dirty optical surface, reflector, or sensor sleeve",
      "Loose connection, low-voltage power loss, or damaged sensor",
      "A second untracked carrier is moving in the system",
      "Sensor is misaligned or intermittently switching near its threshold",
    ],
    safety: [
      "Do not clear or dismiss a sighting until a physical carrier has been ruled out.",
      "Keep the affected path unavailable when an untracked carrier may be present.",
      "Isolate power before reaching into a station or diverter sensor location.",
    ],
    tools: [
      "Transaction sighting history",
      "Sensor-state view",
      "Approved optical cleaning supplies",
    ],
    steps: [
      {
        title: "Correlate the sighting",
        instruction:
          "Compare timestamp, device, transaction path, expected phase, and adjacent-device sightings.",
        expected:
          "The signal can be classified as expected, a likely physical carrier, or anomalous.",
        ifAbnormal:
          "Treat out-of-sequence sightings as a possible untracked carrier until proven otherwise.",
      },
      {
        title: "Inspect the sensing point",
        instruction:
          "With the device safe, inspect for a carrier, debris, dirty optics, reflector damage, and mechanical misalignment.",
        expected: "The optical path is clean and unobstructed.",
        ifAbnormal:
          "Recover the obstruction or clean using the approved dry method before further testing.",
        requiresShutdown: true,
      },
      {
        title: "Verify stable electrical state",
        instruction:
          "Observe repeated set/clear transitions and inspect low-voltage power, connectors, and wiring for intermittent behavior.",
        expected:
          "The signal switches once per controlled obstruction and remains stable otherwise.",
        ifAbnormal: "Remove the device from service and repair the sensor circuit.",
        role: "technician",
      },
    ],
    verification: [
      "Controlled obstruction produces repeatable set and clear states.",
      "An empty test carrier produces the expected ordered sightings.",
      "No inactive-device or floater advisory returns during observation.",
    ],
    escalateWhen: [
      "An untracked carrier may still be in the system.",
      "Sensor behavior changes with vibration or device movement.",
      "Power, wiring, board input, or sensor replacement must be tested electrically.",
    ],
    sourceSection: "Carrier sensor faults and advisory definitions",
  },
  {
    id: "touchscreen-boot",
    title: "Station touchscreen will not boot correctly",
    faultNames: ["Boot failure", "Application not starting", "Invalid network address"],
    category: "Controls & network",
    deviceTypes: ["Touchscreen", "Station"],
    risk: "caution",
    summary:
      "Distinguish storage-media boot failure from slow network initialization, invalid addressing, cabling, and application configuration.",
    symptoms: [
      "Normal startup splash screen never appears",
      "Application does not launch after the expected startup interval",
      "Boot is unusually slow",
      "Touchscreen receives a self-assigned 169.254.x.x address",
    ],
    likelyCauses: [
      "Storage media is loose, damaged, or not selected for boot",
      "Touchscreen cannot obtain a DHCP lease",
      "Network cables are reversed, loose, or damaged",
      "Touchscreen network or control-center configuration is incorrect",
      "Touchscreen computer has failed",
    ],
    safety: [
      "Follow the approved power-down sequence before touching storage media or internal cabling.",
      "Do not clone or swap site configuration without preserving station identity and revision compatibility.",
      "Coordinate DHCP, subnet, and switch-port testing with hospital IT.",
    ],
    tools: [
      "Boot-state observation",
      "Approved spare storage image",
      "Hospital-approved network tester",
    ],
    steps: [
      {
        title: "Classify the boot stage",
        instruction:
          "Record the last visible startup state, elapsed time, tones, and whether the station application ever appears.",
        expected:
          "The failure is isolated to power, boot media, operating system, application, or network initialization.",
        ifAbnormal: "Do not repeatedly power cycle without recording the observed stage.",
      },
      {
        title: "Check approved boot-media installation",
        instruction:
          "With power isolated, verify the storage media and boot-selection hardware are seated according to the exact touchscreen revision.",
        expected: "Media and boot selection match the approved build record.",
        ifAbnormal: "Reseat or substitute only revision-compatible, site-approved media.",
        requiresShutdown: true,
      },
      {
        title: "Validate network acquisition",
        instruction:
          "If the application boots slowly, inspect the assigned address and physical link. Test the same approved port with hospital IT equipment when needed.",
        expected:
          "The station receives its documented static address or a valid lease on the correct subnet.",
        ifAbnormal:
          "Resolve cable, port, VLAN, DHCP, or local configuration before replacing the touchscreen.",
        role: "it",
      },
    ],
    verification: [
      "Touchscreen boots to the station application within the site baseline.",
      "Station identity and control-center endpoint match the approved record.",
      "Local controller communication and upstream status both remain stable.",
    ],
    escalateWhen: [
      "No boot stage appears despite confirmed power.",
      "Approved storage media fails in this touchscreen but succeeds in a known-good unit.",
      "A replacement image, touchscreen, or network change is required.",
    ],
    sourceSection: "7-inch touchscreen communications troubleshooting",
  },
  {
    id: "slow-travel-drift",
    title: "Carrier travel is slow, drifting, or repeatedly redirected",
    faultNames: ["Carrier estimated travel time exceeded", "Carrier drift", "Cannot advance"],
    category: "Carrier movement",
    deviceTypes: ["Carrier", "Diverter", "Blower", "Tube path"],
    risk: "caution",
    summary:
      "Compare route timing and phase sightings to carrier condition, airflow integrity, path geometry, and configured tube length.",
    symptoms: [
      "Carrier reaches a leg endpoint later than expected",
      "Carrier falls back into a turnaround before pressure phase",
      "Transaction redirects to origin",
      "One route is slow while other paths in the zone are normal",
    ],
    likelyCauses: [
      "Worn carrier bands, excessive payload, open latch, or damaged carrier",
      "Air leak at station seals, pressure relief flap, diverter seals, or tube joint",
      "Weak blower airflow or incorrect air-shifter feedback",
      "Vertical turnaround geometry or backdraft allows carrier drift",
      "Configured pipe length does not match the installed route",
    ],
    safety: [
      "Use an empty or approved test carrier; never test with clinical contents.",
      "Keep the receiving station clear when arrival speed or direction is uncertain.",
      "Do not alter route-length configuration solely to hide a mechanical slowdown.",
    ],
    tools: ["Transaction phase timing", "Path map and pipe lengths", "Approved test carriers"],
    steps: [
      {
        title: "Compare route timing",
        instruction:
          "Capture vacuum and pressure leg times, expected times, turnaround sighting, destination sighting, and any redirect/search sequence.",
        expected: "The slow segment and phase are identified.",
        ifAbnormal:
          "Correct missing or inaccurate path metadata before drawing timing conclusions.",
      },
      {
        title: "Inspect the carrier",
        instruction:
          "Check payload weight, latches, shell damage, contamination, and wear-band condition using an approved empty test carrier for comparison.",
        expected: "A known-good carrier travels normally on the same path.",
        ifAbnormal:
          "Remove damaged carriers from service and correct packaging or allocation practices.",
      },
      {
        title: "Localize airflow loss or drift",
        instruction:
          "Compare other endpoints on the same blower, then inspect seals, pressure relief hardware, diverter alignment, sampling feedback, and turnaround orientation.",
        expected: "The condition is isolated to carrier, endpoint, route, or zone airflow.",
        ifAbnormal: "Open a targeted mechanical inspection rather than increasing timeouts.",
        role: "technician",
      },
    ],
    verification: [
      "Multiple known-good empty carriers complete the route within the documented baseline.",
      "Turnaround and destination sightings occur in the correct phase order.",
      "No travel-time, drift, or cannot-advance advisory returns.",
    ],
    escalateWhen: [
      "Arrival speed is unsafe or inconsistent.",
      "Multiple routes on the same blower show weak lift or long travel time.",
      "Tube geometry, major seals, or configuration data require engineering correction.",
    ],
    sourceSection: "Transaction searching, travel-time calculation, and carrier drift advisory",
  },
  {
    id: "station-full-sensor",
    title: "Station full-bin or false-full condition",
    faultNames: ["Station full bin", "Full receive bin"],
    category: "Station",
    deviceTypes: ["Station", "Sensor"],
    risk: "routine",
    summary:
      "Determine whether the receive bin is genuinely full or the optical sensor is blocked, dirty, misaligned, or seeing a carrier behind the dispatcher.",
    symptoms: [
      "Station signs off from sending and receiving",
      "Full-bin indication remains active after carriers are removed",
      "Alarm returns immediately after clearing",
    ],
    likelyCauses: [
      "Excess carriers in the receive bin",
      "Carrier lodged behind the dispatcher",
      "Dirty sensor lens or reflector",
      "Sensor or reflector misalignment, loose connection, or power loss",
    ],
    safety: [
      "Do not reach behind the dispatcher while the station is energized.",
      "Isolate power before removing a trapped carrier or adjusting hardware.",
    ],
    tools: ["Station sensor view", "Dry cotton swab", "Approved inspection light"],
    steps: [
      {
        title: "Clear the receiving area",
        instruction:
          "Remove and account for carriers in the receive bin using normal operator handling.",
        expected: "The sensor clears after the programmed delay.",
        ifAbnormal: "Continue with a non-contact inspection of the beam and reflector path.",
        role: "operator",
      },
      {
        title: "Inspect for a hidden obstruction",
        instruction:
          "Look for a carrier or debris behind the dispatcher and confirm the beam path is unobstructed.",
        expected: "No obstruction is present behind the dispatcher.",
        ifAbnormal:
          "Isolate power before recovery; do not command the dispatcher through the obstruction.",
        requiresShutdown: true,
      },
      {
        title: "Clean and validate the sensor",
        instruction:
          "Clean the optical surfaces using the approved dry method, then verify stable set and clear states.",
        expected: "The sensor changes state once and remains stable.",
        ifAbnormal:
          "Inspect alignment, reflector condition, power, wiring, and sensor replacement needs.",
      },
    ],
    verification: [
      "Station returns to available state.",
      "The sensor detects an intentional test obstruction and clears afterward.",
      "One self-send completes without a repeat alarm.",
    ],
    escalateWhen: [
      "A carrier is trapped behind the mechanism.",
      "The sensor flickers or remains active with a clear beam path.",
      "Position faults accompany the full-bin condition.",
    ],
    sourceSection: "Station operation and full-bin fault definition",
  },
  {
    id: "contamination-response",
    title: "Suspected spill or contamination event",
    faultNames: ["Contamination", "Specimen spill", "Biohazard event"],
    category: "Safety & contamination",
    deviceTypes: ["Carrier", "Station", "Tube path"],
    risk: "restricted",
    summary:
      "Immediately contain operational risk, preserve route evidence, and hand control to hospital infection prevention before any decontamination work.",
    symptoms: [
      "Visible leakage in a carrier or station",
      "Suspected contaminated carrier in transit",
      "Unknown downstream carriers may have crossed the affected path",
    ],
    likelyCauses: [
      "Improperly sealed primary or secondary containment",
      "Overloaded or damaged carrier",
      "Fragile contents not immobilized",
      "Carrier opened or was damaged during transit",
    ],
    safety: [
      "Stop the affected zone and notify infection prevention, facilities, and all impacted users.",
      "Do not move carriers or use blowers when airborne contamination is possible.",
      "Use PPE, disinfectants, disposal methods, and exposure response defined by current hospital policy and product labels.",
      "Never record patient, specimen, medication, or medical-record identifiers in this application.",
    ],
    tools: ["Transaction route history", "System map", "Hospital spill kit", "Approved PPE"],
    steps: [
      {
        title: "Stop and isolate",
        instruction:
          "Place the affected zone out of service, notify users, and leave potentially contaminated carriers in place until infection prevention evaluates the event.",
        expected: "No new transactions can enter the affected route.",
        ifAbnormal:
          "Escalate immediately to hospital incident command or the designated safety authority.",
        role: "infection-control",
      },
      {
        title: "Reconstruct the exposure path",
        instruction:
          "Use transaction history to identify the carrier route and any subsequent carriers that traversed the same devices or tube segments.",
        expected:
          "The affected path, devices, carriers, and time window are known without recording clinical identifiers.",
        ifAbnormal: "Expand the isolation boundary until route uncertainty is resolved.",
      },
      {
        title: "Select the hospital-approved method",
        instruction:
          "Infection prevention determines whether blower-assisted or manual sectional decontamination is permitted based on the contaminant and airborne risk.",
        expected: "A written, current hospital procedure and responsible lead are assigned.",
        ifAbnormal:
          "Do not improvise a cleaning solution, concentration, exposure time, or airflow procedure.",
        role: "infection-control",
      },
      {
        title: "Document clearance",
        instruction:
          "Record infrastructure areas cleaned, responsible teams, verification results, and authorization to return the route to service.",
        expected: "Infection prevention and facilities jointly approve restoration.",
        ifAbnormal: "Keep the affected route unavailable.",
      },
    ],
    verification: [
      "Infection prevention provides documented clearance.",
      "All affected carriers and inserts are accounted for under hospital policy.",
      "Facilities confirms the route is dry, mechanically clear, and safe for a controlled empty test.",
    ],
    escalateWhen: [
      "Airborne, highly infectious, hazardous-drug, chemical, or unknown contamination is possible.",
      "The carrier route or downstream exposure set cannot be reconstructed.",
      "Exposure to personnel may have occurred.",
    ],
    sourceSection: "Exposure control and cleaning procedures",
  },
];

export const diagnosticCategories: Array<"All" | DiagnosticCategory> = [
  "All",
  "Carrier movement",
  "Station",
  "Diverter",
  "Blower",
  "Controls & network",
  "Safety & contamination",
];

const diagnosticStopWords = new Set([
  "about",
  "after",
  "again",
  "could",
  "does",
  "doesn",
  "from",
  "have",
  "help",
  "issue",
  "into",
  "not",
  "problem",
  "that",
  "the",
  "then",
  "this",
  "what",
  "with",
  "working",
]);

function diagnosticTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((token) => token.length > 2 && !diagnosticStopWords.has(token));
}

export function rankTroubleshootingGuides(
  query: string,
  selectedGuideId?: string,
): TroubleshootingGuide[] {
  return scoreTroubleshootingGuides(query, selectedGuideId).map(({ guide }) => guide);
}

export function scoreTroubleshootingGuides(
  query: string,
  selectedGuideId?: string,
): Array<{ guide: TroubleshootingGuide; score: number; matches: number }> {
  const normalizedQuery = query.trim().toLowerCase();
  const queryTokens = diagnosticTokens(query);
  const scored = troubleshootingGuides.map((guide) => {
    const searchableTokens = new Set(
      diagnosticTokens(
        [
          guide.title,
          ...guide.faultNames,
          guide.category,
          ...guide.deviceTypes,
          guide.summary,
          ...guide.symptoms,
          ...guide.likelyCauses,
        ].join(" "),
      ),
    );
    const matches = queryTokens.reduce(
      (score, token) => score + (searchableTokens.has(token) ? 2 : 0),
      0,
    );
    const phraseMatch = [guide.title, ...guide.faultNames].some((value) => {
      const normalizedPhrase = value.toLowerCase();
      const phraseTokens = diagnosticTokens(normalizedPhrase);
      return (
        normalizedQuery.includes(normalizedPhrase) ||
        (phraseTokens.length > 0 && phraseTokens.every((token) => queryTokens.includes(token)))
      );
    });
    return { guide, matches: matches + (phraseMatch ? 8 : 0) };
  });
  const maxMatches = Math.max(0, ...scored.map(({ matches }) => matches));
  const selectedBonus = maxMatches <= 2 ? 6 : 1;

  return scored
    .map(({ guide, matches }) => ({
      guide,
      matches,
      score: matches + (guide.id === selectedGuideId ? selectedBonus : 0),
    }))
    .sort((left, right) => right.score - left.score)
    .map(({ guide, score, matches }) => ({ guide, score, matches }));
}

export function searchTroubleshootingGuides(query: string, category: string) {
  const normalized = query.trim().toLowerCase();
  return troubleshootingGuides.filter((guide) => {
    if (category !== "All" && guide.category !== category) return false;
    if (!normalized) return true;
    return [
      guide.title,
      guide.summary,
      guide.category,
      ...guide.faultNames,
      ...guide.deviceTypes,
      ...guide.symptoms,
      ...guide.likelyCauses,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalized);
  });
}
