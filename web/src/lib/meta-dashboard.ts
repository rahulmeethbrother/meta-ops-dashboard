export interface MetaAccountMetric {
  accountId: string;
  name: string;
  status: "active" | "disabled" | "unsettled";
  spend: number;
  impressions: number;
  clicks: number;
  lpvs: number;
  cpm: number;
  ctr: number;
  cpc: number;
  costPerLpv: number;
  rejectedAds: number;
  activeCampaigns: number;
  activeAdsets: number;
  activeAds: number;
  dailyBudget: number;
}

export interface MetaOverview {
  demo: boolean;
  source: "demo" | "mcp-bridge";
  fetchedAt: string;
  timezone: string;
  accounts: MetaAccountMetric[];
}

export const DEMO_META_OVERVIEW: MetaOverview = {
  demo: true,
  source: "demo",
  fetchedAt: "2026-08-29T12:42:00+07:00",
  timezone: "Asia/Ho_Chi_Minh",
  accounts: [
    {
      accountId: "act_1006394085064486",
      name: "FB 2",
      status: "disabled",
      spend: 98.93,
      impressions: 16951,
      clicks: 1503,
      lpvs: 704,
      cpm: 5.84,
      ctr: 8.87,
      cpc: 0.0658,
      costPerLpv: 0.1405,
      rejectedAds: 0,
      activeCampaigns: 0,
      activeAdsets: 0,
      activeAds: 0,
      dailyBudget: 500,
    },
    {
      accountId: "act_3943416362586935",
      name: "H38",
      status: "active",
      spend: 231.46,
      impressions: 101261,
      clicks: 16863,
      lpvs: 19438,
      cpm: 2.29,
      ctr: 16.65,
      cpc: 0.0137,
      costPerLpv: 0.0119,
      rejectedAds: 1,
      activeCampaigns: 5,
      activeAdsets: 85,
      activeAds: 85,
      dailyBudget: 95,
    },
    {
      accountId: "act_932886996465458",
      name: "FB 3",
      status: "disabled",
      spend: 3.25,
      impressions: 410,
      clicks: 36,
      lpvs: 21,
      cpm: 7.93,
      ctr: 8.78,
      cpc: 0.0903,
      costPerLpv: 0.1548,
      rejectedAds: 0,
      activeCampaigns: 0,
      activeAdsets: 0,
      activeAds: 0,
      dailyBudget: 0,
    },
    {
      accountId: "act_1043217503605609",
      name: "FB 4",
      status: "active",
      spend: 0,
      impressions: 0,
      clicks: 0,
      lpvs: 0,
      cpm: 0,
      ctr: 0,
      cpc: 0,
      costPerLpv: 0,
      rejectedAds: 19,
      activeCampaigns: 0,
      activeAdsets: 0,
      activeAds: 0,
      dailyBudget: 19,
    },
  ],
};
