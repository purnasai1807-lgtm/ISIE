export interface NavItem {
  id: string;
  label: string;
  href: string;
  iconName: string;
  badge?: string;
  badgeVariant?: "critical" | "warning" | "cyan" | "muted" | "orange";
  description: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAVIGATION_SECTIONS: NavSection[] = [
  {
    title: "COMMAND",
    items: [
      {
        id: "dashboard",
        label: "Command Center",
        href: "/dashboard",
        iconName: "ShieldAlert",
        description: "Primary tactical command post and merged operational view",
      },
      {
        id: "map",
        label: "Situation Map",
        href: "/geospatial",
        iconName: "MapPin",
        description: "Global 3D Earth view & 2D tactical vector GIS canvas",
      },
      {
        id: "global",
        label: "Global Situation",
        href: "/global",
        iconName: "Globe2",
        description: "Worldwide operating environment and macro crisis telemetry",
      },
    ],
  },
  {
    title: "OPERATIONS",
    items: [
      {
        id: "incidents",
        label: "Incidents",
        href: "/incidents",
        iconName: "Flame",
        badge: "4 ACTIVE",
        badgeVariant: "orange",
        description: "Active crisis triage, event escalation, and hazard perimeters",
      },
      {
        id: "alerts",
        label: "Alert Center",
        href: "/alerts",
        iconName: "BellRing",
        badge: "CRITICAL",
        badgeVariant: "critical",
        description: "Priority alerts, hazard surge warnings, and response triggers",
      },
      {
        id: "resources",
        label: "Resources & Shelters",
        href: "/resources",
        iconName: "Truck",
        description: "Disaster battalions, shelter capacity, and relief logistics",
      },
    ],
  },
  {
    title: "INTELLIGENCE",
    items: [
      {
        id: "intelligence",
        label: "Intelligence & Evidence",
        href: "/intelligence",
        iconName: "FileCheck2",
        description: "Multi-source evidence chains (IMD, CWC, ISRO, Copernicus)",
      },
      {
        id: "analytics",
        label: "Analytics & Capacity",
        href: "/analytics",
        iconName: "Activity",
        description: "Carrying capacity thresholds, vulnerability, and relocation index",
      },
      {
        id: "timeline",
        label: "Event Timeline",
        href: "/timeline",
        iconName: "Clock",
        description: "Multi-domain event evolution and projection scrub timeline",
      },
      {
        id: "scenario",
        label: "Scenario Simulator",
        href: "/scenario",
        iconName: "Cpu",
        description: "Stress testing, carrying capacity breaches, and what-if permutations",
      },
    ],
  },
  {
    title: "STARTUP",
    items: [
      { id: "startup", label: "Startup Capability Center", href: "/startup", iconName: "ShieldCheck", description: "Data providers, dispatch controls, cloud readiness and commercial integrations" },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      {
        id: "notifications",
        label: "Notifications",
        href: "/notifications",
        iconName: "Radio",
        description: "System alerts, ingestion logs, and advisory bulletins",
      },
      {
        id: "profile",
        label: "Officer Profile",
        href: "/profile",
        iconName: "UserCheck",
        description: "Clearance level, duty assignment, and operating scope",
      },
      {
        id: "settings",
        label: "Settings",
        href: "/settings",
        iconName: "SlidersHorizontal",
        description: "Display density, map defaults, and tactical preferences",
      },
      {
        id: "help",
        label: "Help & Docs",
        href: "/help",
        iconName: "HelpCircle",
        description: "System documentation, operating manual, and keyboard shortcuts",
      },
    ],
  },
];

export const OPERATING_SCOPES = [
  {
    id: "scope-national",
    code: "IND-NAT-01",
    name: "National Strategic Domain",
    sector: "NATIONAL_STRATEGIC",
    activeWatch: true,
    zoneCount: 4,
  },
  {
    id: "scope-himalayan",
    code: "HIM-SEC-03",
    name: "Himalayan Belt & Glacial Watershed",
    sector: "HIMALAYAN_BELT",
    activeWatch: true,
    zoneCount: 1,
  },
  {
    id: "scope-northern",
    code: "NOR-SEC-02",
    name: "Northern Sector & Flood Plains",
    sector: "NORTHERN_SECTOR",
    activeWatch: false,
    zoneCount: 1,
  },
  {
    id: "scope-coastal",
    code: "CST-SEC-04",
    name: "Coastal & Cyclone Surge Corridor",
    sector: "COASTAL_ZONES",
    activeWatch: true,
    zoneCount: 1,
  },
  {
    id: "scope-peninsular",
    code: "PEN-SEC-05",
    name: "Peninsular River Basins",
    sector: "PENINSULAR_BASIN",
    activeWatch: false,
    zoneCount: 1,
  },
];
