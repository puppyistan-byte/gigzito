export interface RightRailAd {
  id: string;
  title: string;
  body: string;
  imageUrl: string;
  targetUrl?: string | null;
  cta: string;
  active: boolean;
}

const rightRailAds: RightRailAd[] = [
  {
    id: "aurum-001",
    title: "AI Bot Trading Continually Performs",
    body: "Let an advanced AI trade for you 24/7. Set it up once and let it work around the clock.",
    imageUrl: "/ads/aurum.png",
    targetUrl: "https://aiwealthsecret.io/?ref_code=ERUEUE&disable_popups=true",
    cta: "Learn More",
    active: true,
  },
];

export default rightRailAds;
