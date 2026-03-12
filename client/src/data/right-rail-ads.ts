export interface RightRailAd {
  id: string;
  title: string;
  body: string;
  imageUrl: string;
  targetUrl: string;
  cta: string;
  active: boolean;
}

const rightRailAds: RightRailAd[] = [
  {
    id: "aurum-001",
    title: "AI Bot Trading Continually Performs",
    body: "Let an advanced AI trade for you 24/7. Set it up once and let it work around the clock.",
    imageUrl: "/ads/aurum.png",
    targetUrl: "https://aurum.com",
    cta: "Learn More",
    active: true,
  },
];

export default rightRailAds;
