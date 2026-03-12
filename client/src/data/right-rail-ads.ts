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
    id: "ad-001",
    title: "Grow Your Brand with Gigzito Pro",
    body: "Get featured placement, priority listing, and unlimited video uploads. Join thousands of providers already growing on Gigzito.",
    imageUrl: "/ads/ad-placeholder-1.jpg",
    targetUrl: "https://gigzito.com",
    cta: "Get Started",
    active: true,
  },
  {
    id: "ad-002",
    title: "Your Ad Could Be Here",
    body: "Reach thousands of engaged buyers and service seekers daily. Premium sponsor slots available now — limited inventory.",
    imageUrl: "/ads/ad-placeholder-2.jpg",
    targetUrl: "https://gigzito.com",
    cta: "Advertise With Us",
    active: true,
  },
  {
    id: "ad-003",
    title: "Launch Your Gig Today",
    body: "List your promo video for just $3 and get in front of motivated buyers across 11 business categories.",
    imageUrl: "/ads/ad-placeholder-3.jpg",
    targetUrl: "https://gigzito.com",
    cta: "Post Your Gig",
    active: true,
  },
];

export default rightRailAds;
