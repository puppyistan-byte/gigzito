--
-- PostgreSQL database dump
--

\restrict blQQ0eXKJdJbI0hwpaw0WOiTVkAw6sbBg2I7kMUvPXmlWBMIXkEwKdNyFKJrRAM

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: gig_jack_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.gig_jack_status AS ENUM (
    'PENDING_REVIEW',
    'APPROVED',
    'REJECTED',
    'NEEDS_IMPROVEMENT',
    'DENIED'
);


--
-- Name: listing_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.listing_status AS ENUM (
    'PENDING',
    'ACTIVE',
    'PAUSED',
    'REMOVED',
    'TRIAGED'
);


--
-- Name: role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.role AS ENUM (
    'VISITOR',
    'PROVIDER',
    'SUPERUSER',
    'ADMIN',
    'MEMBER',
    'MARKETER',
    'INFLUENCER',
    'CORPORATE',
    'SUPER_ADMIN',
    'COORDINATOR'
);


--
-- Name: vertical; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.vertical AS ENUM (
    'MARKETING',
    'COACHING',
    'COURSES',
    'MUSIC',
    'CRYPTO',
    'INFLUENCER',
    'PRODUCTS',
    'FLASH_SALE',
    'FLASH_COUPON',
    'MUSIC_GIGS',
    'EVENTS',
    'CORPORATE_DEALS'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: all_eyes_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.all_eyes_slots (
    id integer NOT NULL,
    provider_id integer NOT NULL,
    video_listing_id integer,
    custom_title text,
    duration_minutes integer NOT NULL,
    start_at timestamp without time zone NOT NULL,
    end_at timestamp without time zone NOT NULL,
    status text DEFAULT 'scheduled'::text NOT NULL,
    price_cents integer DEFAULT 0 NOT NULL,
    created_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: all_eyes_slots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.all_eyes_slots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: all_eyes_slots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.all_eyes_slots_id_seq OWNED BY public.all_eyes_slots.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    actor_user_id integer,
    action_type text NOT NULL,
    target_type text NOT NULL,
    target_id integer,
    old_value text,
    new_value text,
    used_override boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: gig_jacks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gig_jacks (
    id integer NOT NULL,
    provider_id integer NOT NULL,
    company_url text NOT NULL,
    artwork_url text NOT NULL,
    offer_title text NOT NULL,
    description text NOT NULL,
    cta_link text NOT NULL,
    countdown_minutes integer NOT NULL,
    coupon_code text,
    quantity_limit integer,
    status public.gig_jack_status DEFAULT 'PENDING_REVIEW'::public.gig_jack_status NOT NULL,
    review_note text,
    bot_warning boolean DEFAULT false NOT NULL,
    bot_warning_message text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    tagline text,
    category text,
    scheduled_at timestamp without time zone,
    flash_duration_seconds integer DEFAULT 7,
    booked_date text,
    booked_hour integer,
    approved_at timestamp without time zone,
    approved_by integer,
    denied_at timestamp without time zone,
    denied_by integer,
    removed_at timestamp without time zone,
    removed_by integer,
    offer_duration_minutes integer DEFAULT 10,
    display_state text DEFAULT 'hidden'::text NOT NULL,
    siren_enabled boolean DEFAULT true NOT NULL,
    flash_started_at timestamp without time zone,
    flash_ended_at timestamp without time zone,
    offer_started_at timestamp without time zone,
    offer_ends_at timestamp without time zone,
    completed_at timestamp without time zone
);


--
-- Name: gig_jacks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gig_jacks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gig_jacks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gig_jacks_id_seq OWNED BY public.gig_jacks.id;


--
-- Name: injected_feeds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.injected_feeds (
    id integer NOT NULL,
    platform text NOT NULL,
    source_url text NOT NULL,
    display_title text,
    category text,
    inject_mode text DEFAULT 'fallback'::text NOT NULL,
    status text DEFAULT 'inactive'::text NOT NULL,
    starts_at timestamp without time zone,
    ends_at timestamp without time zone,
    created_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: injected_feeds_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.injected_feeds_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: injected_feeds_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.injected_feeds_id_seq OWNED BY public.injected_feeds.id;


--
-- Name: leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leads (
    id integer NOT NULL,
    video_id integer NOT NULL,
    creator_user_id integer NOT NULL,
    first_name text NOT NULL,
    email text,
    phone text,
    message text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    video_title text,
    category text
);


--
-- Name: leads_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.leads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: leads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.leads_id_seq OWNED BY public.leads.id;


--
-- Name: live_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.live_sessions (
    id integer NOT NULL,
    creator_user_id integer NOT NULL,
    provider_id integer NOT NULL,
    title text NOT NULL,
    category text DEFAULT 'INFLUENCER'::text NOT NULL,
    mode text DEFAULT 'external'::text NOT NULL,
    platform text,
    stream_url text NOT NULL,
    thumbnail_url text,
    viewer_count integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    started_at timestamp without time zone DEFAULT now() NOT NULL,
    ended_at timestamp without time zone,
    tier_minutes integer DEFAULT 60 NOT NULL,
    tier_price_cents integer DEFAULT 2500 NOT NULL
);


--
-- Name: live_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.live_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: live_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.live_sessions_id_seq OWNED BY public.live_sessions.id;


--
-- Name: love_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.love_votes (
    id integer NOT NULL,
    voter_user_id integer NOT NULL,
    provider_id integer NOT NULL,
    month_key text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: love_votes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.love_votes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: love_votes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.love_votes_id_seq OWNED BY public.love_votes.id;


--
-- Name: mfa_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mfa_codes (
    id integer NOT NULL,
    user_id integer NOT NULL,
    code text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used_at timestamp without time zone,
    resend_count integer DEFAULT 0 NOT NULL,
    last_resend_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: mfa_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mfa_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mfa_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mfa_codes_id_seq OWNED BY public.mfa_codes.id;


--
-- Name: provider_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.provider_profiles (
    id integer NOT NULL,
    user_id integer NOT NULL,
    display_name text DEFAULT ''::text NOT NULL,
    bio text DEFAULT ''::text NOT NULL,
    avatar_url text DEFAULT ''::text NOT NULL,
    thumb_url text DEFAULT ''::text NOT NULL,
    contact_email text,
    contact_phone text,
    contact_telegram text,
    website_url text,
    username text,
    primary_category text,
    location text,
    instagram_url text,
    youtube_url text,
    tiktok_url text,
    webhook_url text,
    facebook_url text,
    discord_url text,
    twitter_url text,
    photo1_url text,
    photo2_url text,
    photo3_url text,
    photo4_url text,
    photo5_url text,
    photo6_url text
);


--
-- Name: provider_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.provider_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: provider_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.provider_profiles_id_seq OWNED BY public.provider_profiles.id;


--
-- Name: session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    role public.role DEFAULT 'VISITOR'::public.role NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    disclaimer_accepted boolean DEFAULT false NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    deleted_at timestamp without time zone,
    email_verified boolean DEFAULT false NOT NULL,
    email_verification_token text
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: video_likes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.video_likes (
    id integer NOT NULL,
    video_id integer NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: video_likes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.video_likes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: video_likes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.video_likes_id_seq OWNED BY public.video_likes.id;


--
-- Name: video_listings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.video_listings (
    id integer NOT NULL,
    provider_id integer NOT NULL,
    vertical public.vertical NOT NULL,
    title text NOT NULL,
    video_url text NOT NULL,
    duration_seconds integer NOT NULL,
    description text,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    cta_url text,
    status public.listing_status DEFAULT 'ACTIVE'::public.listing_status NOT NULL,
    drop_date date NOT NULL,
    price_paid_cents integer DEFAULT 300 NOT NULL,
    stripe_session_id text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    cta_label text,
    flash_sale_ends_at timestamp without time zone,
    coupon_code text,
    product_price text,
    product_purchase_url text,
    product_stock text,
    cta_type text,
    triaged_at timestamp without time zone,
    triaged_by integer,
    triaged_reason text,
    like_count integer DEFAULT 0 NOT NULL,
    reveal_url boolean DEFAULT true NOT NULL,
    reveal_email boolean DEFAULT false NOT NULL,
    reveal_name boolean DEFAULT false NOT NULL,
    collect_email boolean DEFAULT true NOT NULL
);


--
-- Name: video_listings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.video_listings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: video_listings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.video_listings_id_seq OWNED BY public.video_listings.id;


--
-- Name: zito_tv_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zito_tv_events (
    id integer NOT NULL,
    title text NOT NULL,
    description text,
    host_name text NOT NULL,
    host_user_id integer,
    category text DEFAULT 'OTHER'::text NOT NULL,
    live_url text,
    cta_url text,
    cover_image_url text,
    duration_minutes integer DEFAULT 60 NOT NULL,
    start_at timestamp without time zone NOT NULL,
    end_at timestamp without time zone NOT NULL,
    status text DEFAULT 'scheduled'::text NOT NULL,
    created_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: zito_tv_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.zito_tv_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: zito_tv_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.zito_tv_events_id_seq OWNED BY public.zito_tv_events.id;


--
-- Name: all_eyes_slots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.all_eyes_slots ALTER COLUMN id SET DEFAULT nextval('public.all_eyes_slots_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: gig_jacks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gig_jacks ALTER COLUMN id SET DEFAULT nextval('public.gig_jacks_id_seq'::regclass);


--
-- Name: injected_feeds id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.injected_feeds ALTER COLUMN id SET DEFAULT nextval('public.injected_feeds_id_seq'::regclass);


--
-- Name: leads id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads ALTER COLUMN id SET DEFAULT nextval('public.leads_id_seq'::regclass);


--
-- Name: live_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_sessions ALTER COLUMN id SET DEFAULT nextval('public.live_sessions_id_seq'::regclass);


--
-- Name: love_votes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.love_votes ALTER COLUMN id SET DEFAULT nextval('public.love_votes_id_seq'::regclass);


--
-- Name: mfa_codes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mfa_codes ALTER COLUMN id SET DEFAULT nextval('public.mfa_codes_id_seq'::regclass);


--
-- Name: provider_profiles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_profiles ALTER COLUMN id SET DEFAULT nextval('public.provider_profiles_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: video_likes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_likes ALTER COLUMN id SET DEFAULT nextval('public.video_likes_id_seq'::regclass);


--
-- Name: video_listings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_listings ALTER COLUMN id SET DEFAULT nextval('public.video_listings_id_seq'::regclass);


--
-- Name: zito_tv_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zito_tv_events ALTER COLUMN id SET DEFAULT nextval('public.zito_tv_events_id_seq'::regclass);


--
-- Data for Name: all_eyes_slots; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.all_eyes_slots (id, provider_id, video_listing_id, custom_title, duration_minutes, start_at, end_at, status, price_cents, created_by, created_at) FROM stdin;
1	1	\N	Test flash sale spotlight	15	2026-03-08 02:53:00	2026-03-08 03:08:00	scheduled	1500	1	2026-03-08 02:43:27.000929
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, actor_user_id, action_type, target_type, target_id, old_value, new_value, used_override, created_at) FROM stdin;
\.


--
-- Data for Name: gig_jacks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.gig_jacks (id, provider_id, company_url, artwork_url, offer_title, description, cta_link, countdown_minutes, coupon_code, quantity_limit, status, review_note, bot_warning, bot_warning_message, created_at, updated_at, tagline, category, scheduled_at, flash_duration_seconds, booked_date, booked_hour, approved_at, approved_by, denied_at, denied_by, removed_at, removed_by, offer_duration_minutes, display_state, siren_enabled, flash_started_at, flash_ended_at, offer_started_at, offer_ends_at, completed_at) FROM stdin;
2	1	https://weakoffer.example.com	https://picsum.photos/seed/weak/400/300	5% off our product	We are offering a small discount on our items today.	https://weakoffer.example.com/deal	5	\N	\N	APPROVED	\N	t	This offer may not qualify as a GigJack. GigJacks should be high-impact limited-time offers. Consider increasing the discount or adding scarcity.	2026-03-06 22:11:56.311563	2026-03-06 22:12:44.333	\N	\N	\N	7	\N	\N	\N	\N	\N	\N	\N	\N	10	hidden	t	\N	\N	\N	\N	\N
4	34	https://gigzito.com	https://picsum.photos/400/300	Admin Flash Offer	Limited-time admin test offer.	https://gigzito.com	10	\N	\N	APPROVED	\N	f	\N	2026-03-07 13:56:31.660134	2026-03-07 13:56:31.660134	\N	\N	\N	7	\N	\N	\N	\N	\N	\N	\N	\N	10	hidden	t	\N	\N	\N	\N	\N
5	34	https://gigzito.com	https://picsum.photos/400/300	Admin Flash Offer Test	Admin GigJack test	https://gigzito.com	0	\N	\N	APPROVED	\N	f	\N	2026-03-07 14:05:43.603261	2026-03-07 14:05:43.603261	\N	\N	\N	7	\N	\N	\N	\N	\N	\N	\N	\N	10	hidden	t	\N	\N	\N	\N	\N
1	1	https://techcorp.example.com	https://picsum.photos/seed/gigjack/400/300	Get 40% off our Pro Plan — 24 hours only	Use code JACK40 to get 40% off all Pro plans. Limited time flash deal for new customers only.	https://techcorp.example.com/deal	15	JACK40	\N	APPROVED	\N	f	\N	2026-03-06 22:11:32.16841	2026-03-07 16:37:04.654	\N	\N	\N	7	\N	\N	2026-03-07 16:37:04.654	7	\N	\N	\N	\N	10	hidden	t	\N	\N	\N	\N	\N
8	34	https://gigzito.com	https://picsum.photos/seed/test/400/300	15-Min Spacing Test Offer	Testing the new GigJack calendar system with 15-minute spacing rules.	https://gigzito.com	8	\N	\N	APPROVED	\N	f	\N	2026-03-07 16:36:23.223532	2026-03-07 16:52:28.809	\N	\N	2026-03-12 22:00:00	7	2026-03-12	22	2026-03-07 16:52:28.811	7	\N	\N	\N	\N	10	hidden	t	\N	\N	\N	\N	\N
7	34	https://gigzito.com	https://picsum.photos/400/300	Test GigJack Calendar Offer	This is a test GigJack booking with the new calendar flow.	https://gigzito.com	5	\N	\N	APPROVED	\N	f	\N	2026-03-07 16:19:09.83455	2026-03-08 18:35:13.1	\N	\N	2026-03-08 10:00:00	7	2026-03-08	10	\N	\N	\N	\N	\N	\N	10	expired	t	2026-03-08 12:49:26.335	2026-03-08 12:49:36.421	2026-03-08 12:49:36.421	2026-03-08 12:59:36.421	2026-03-08 18:35:13.1
6	34	https://gigzito.com	https://as1.ftcdn.net/v2/jpg/05/64/92/96/1000_F_564929664_92onjBmOqVvlGgB3bg7xmQAnnRJD9LLu.jpg	Test gig jack	whatup doots	https://gigzito.com	0	\N	\N	APPROVED	\N	f	\N	2026-03-07 16:08:01.021303	2026-03-07 18:15:18.016	whatup doots	MUSIC_GIGS	2026-03-07 17:00:00	7	\N	\N	\N	\N	\N	\N	\N	\N	10	expired	t	2026-03-07 18:05:06.448	2026-03-07 18:05:16.582	2026-03-07 18:05:16.582	2026-03-07 18:15:16.582	2026-03-07 18:15:18.016
3	1	https://example.com/deal	https://picsum.photos/200	50% Off All Plans - Limited Time!	Best deal of the week	https://example.com/deal	0	\N	\N	APPROVED	\N	f	\N	2026-03-07 00:53:28.970639	2026-03-07 18:25:31.363	Best deal of the week	MARKETING	2026-03-07 08:00:00	7	\N	\N	2026-03-07 16:36:40.475	7	\N	\N	\N	\N	10	expired	t	2026-03-07 18:15:21.352	2026-03-07 18:15:31.341	2026-03-07 18:15:31.341	2026-03-07 18:25:31.341	2026-03-07 18:25:31.363
10	34	https://gigzito.com	https://pixabay.com/images/search/money/	Test gig jack	what makes this description very descriptive	https://gigzito.com	10	\N	\N	APPROVED	\N	f	\N	2026-03-07 20:30:19.19432	2026-03-07 22:06:37.05	\N	\N	2026-03-07 20:45:00	7	2026-03-07	20	\N	\N	\N	\N	\N	\N	60	expired	t	2026-03-07 20:45:02.519	2026-03-07 20:45:11.72	2026-03-07 20:45:11.72	2026-03-07 21:45:11.72	2026-03-07 22:06:37.05
9	34	https://gigzito.com	https://pixabay.com/images/search/money/	Test gig jack	great offer this is amazin	https://gigzito.com	10	\N	\N	APPROVED	\N	f	\N	2026-03-07 20:07:35.799648	2026-03-07 22:15:37.88	\N	\N	2026-03-07 20:15:00	7	2026-03-07	20	\N	\N	\N	\N	\N	\N	60	expired	t	2026-03-07 20:15:01.786	2026-03-07 20:15:11.006	2026-03-07 20:15:11.006	2026-03-07 21:15:11.006	2026-03-07 22:15:37.88
\.


--
-- Data for Name: injected_feeds; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.injected_feeds (id, platform, source_url, display_title, category, inject_mode, status, starts_at, ends_at, created_by, created_at, updated_at) FROM stdin;
2	YouTube	https://www.youtube.com/watch?v=dQw4w9WgXcQ	Admin Live Feed	\N	immediate	active	\N	\N	7	2026-03-07 23:28:20.280562	2026-03-07 23:28:20.280562
3	YouTube	https://www.youtube.com/live/IP9MOBe1Ins?si=RW6YW5uo_b0dRj7c	Admin Live Feed	\N	immediate	active	\N	\N	7	2026-03-07 23:41:30.745849	2026-03-07 23:41:30.745849
4	YouTube	https://www.youtube.com/live/H5cWx-bR4tM?si=nu4NvnRXq4MgJFwl	Admin Live Feed	\N	immediate	active	\N	\N	7	2026-03-07 23:42:23.672642	2026-03-07 23:42:23.672642
\.


--
-- Data for Name: leads; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.leads (id, video_id, creator_user_id, first_name, email, phone, message, created_at, video_title, category) FROM stdin;
1	34	1	Jane	jane@test.com	\N	Very interested in this offer!	2026-03-06 22:23:21.942803	\N	\N
2	34	1	Jane Smith	jane.smith.test@example.com	\N	\N	2026-03-07 03:53:37.928343	Test Video Title 1772831142748	MARKETING
\.


--
-- Data for Name: live_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.live_sessions (id, creator_user_id, provider_id, title, category, mode, platform, stream_url, thumbnail_url, viewer_count, status, started_at, ended_at, tier_minutes, tier_price_cents) FROM stdin;
1	1	1	Test YouTube Live Session	MARKETING	external	youtube	https://www.youtube.com/watch?v=dQw4w9WgXcQ	\N	0	ended	2026-03-06 23:08:06.589567	2026-03-06 23:09:12.037	60	2500
\.


--
-- Data for Name: love_votes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.love_votes (id, voter_user_id, provider_id, month_key, created_at) FROM stdin;
1	7	4	2026-03	2026-03-08 01:22:24.240947
\.


--
-- Data for Name: mfa_codes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mfa_codes (id, user_id, code, expires_at, used_at, resend_count, last_resend_at, created_at) FROM stdin;
25	1	964484	2026-03-08 03:31:19.505	2026-03-08 03:21:26.721	0	\N	2026-03-08 03:21:19.510247
26	7	977048	2026-03-08 18:48:52.61	2026-03-08 18:39:02.809	0	\N	2026-03-08 18:38:52.647293
\.


--
-- Data for Name: provider_profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.provider_profiles (id, user_id, display_name, bio, avatar_url, thumb_url, contact_email, contact_phone, contact_telegram, website_url, username, primary_category, location, instagram_url, youtube_url, tiktok_url, webhook_url, facebook_url, discord_url, twitter_url, photo1_url, photo2_url, photo3_url, photo4_url, photo5_url, photo6_url) FROM stdin;
2	2	Maya Chen	Life & business coach. I help entrepreneurs unlock their full potential.	https://i.pravatar.cc/150?img=5	https://picsum.photos/seed/maya/400/300	maya@gigzito.com	\N	@mayacoach	\N	mayacoach	COACHING	San Francisco, CA	https://instagram.com/mayacoach	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
3	3	James Okafor	Course creator & e-learning expert. Built 20+ online courses.	https://i.pravatar.cc/150?img=8	https://picsum.photos/seed/james/400/300	james@gigzito.com	\N	\N	https://jamesokafor.io	jamesokafor	COURSES	London, UK	\N	https://youtube.com/@jamesokafor	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
4	4	Sofia Martinez	SEO & content marketing specialist. Ranked 500+ pages #1 on Google.	https://i.pravatar.cc/150?img=9	https://picsum.photos/seed/sofia/400/300	sofia@gigzito.com	+1-555-0101	\N	\N	sofiamarketing	MARKETING	Miami, FL	https://instagram.com/sofiamarketing	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
5	5	Noah Kim	Mindset coach & NLP practitioner. Transforming lives one session at a time.	https://i.pravatar.cc/150?img=12	https://picsum.photos/seed/noah/400/300	noah@gigzito.com	\N	\N	https://noahkimcoach.com	noahkimcoach	COACHING	Austin, TX	\N	https://youtube.com/@noahkimcoach	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
6	6	Priya Patel	Full-stack developer turned educator. Teaching web dev to 50k+ students.	https://i.pravatar.cc/150?img=16	https://picsum.photos/seed/priya/400/300	priya@gigzito.com	\N	@priyateaches	\N	priyateaches	COURSES	Toronto, CA	\N	https://youtube.com/@priyateaches	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
1	1	Alex Rivera	Digital marketing strategist with 10+ years helping brands grow online.	https://i.pravatar.cc/150?img=1	https://picsum.photos/seed/alex/400/300	alex@gigzito.com	\N	\N	https://alexrivera.com	alexrivera	MARKETING	New York, USA	https://instagram.com/alexrivera	https://youtube.com/@alexrivera	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
34	7	Admin	Admin bio for testing purposes.	https://picsum.photos/200	https://picsum.photos/400/225	admin@gigzito.com	\N	\N	https://gigzito.com	admin	MARKETING	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.session (sid, sess, expire) FROM stdin;
D_0h2PB12hDeQjoUYoBhpgB68e1Oo-nX	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-06T22:57:20.323Z","secure":false,"httpOnly":true,"path":"/"},"userId":7,"role":"SUPER_ADMIN"}	2026-04-06 22:57:55
1a4iCpkRO-p_1Dwta_K-D1IQZCTGNuOn	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-06T13:36:11.418Z","secure":false,"httpOnly":true,"path":"/"},"userId":7,"role":"ADMIN"}	2026-04-06 19:02:17
NSCgMn-tErpHtOds85lF32asFx3dz1Yt	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-07T02:40:38.373Z","secure":false,"httpOnly":true,"path":"/"},"userId":1,"role":"PROVIDER"}	2026-04-07 02:41:29
MQBauUwDqV7aTbbjK2mSMHvIuTpAiMBe	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-06T19:26:16.688Z","secure":false,"httpOnly":true,"path":"/"},"userId":7,"role":"SUPER_ADMIN"}	2026-04-06 19:26:30
4m67KvYOS7bVvs-tsNR7Xbd7QohBbGOE	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-05T23:05:26.627Z","secure":false,"httpOnly":true,"path":"/"},"userId":1,"role":"PROVIDER"}	2026-04-05 23:05:42
uDT6R66UZqyA6ne8oF5_kz-1e33YRK1l	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-07T00:18:03.833Z","secure":false,"httpOnly":true,"path":"/"},"userId":1,"role":"PROVIDER"}	2026-04-07 00:18:52
IHIV0yqvo3C2Liawa0b73Q3RYdfqcGKu	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-05T21:38:23.904Z","secure":false,"httpOnly":true,"path":"/"},"userId":1,"role":"PROVIDER"}	2026-04-05 21:38:32
sCaj-QcARYu6Sva81zt9d9ClAHYpfJqL	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-06T16:35:26.922Z","secure":false,"httpOnly":true,"path":"/"},"userId":7,"role":"ADMIN"}	2026-04-06 16:37:05
lD7TsQVrLbaIPNKU78pEg4KlZnAT47gT	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-06T22:40:56.212Z","secure":false,"httpOnly":true,"path":"/"},"userId":7,"role":"SUPER_ADMIN"}	2026-04-06 22:42:05
721B_mJgEaRrBzQTWlqxWR2WuICA46_t	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-06T04:14:11.262Z","secure":false,"httpOnly":true,"path":"/"},"userId":1,"role":"PROVIDER"}	2026-04-06 04:14:12
OHTsR4wrqbllw67UXjr2K6vPcou7ZzgR	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-06T20:11:01.704Z","secure":false,"httpOnly":true,"path":"/"},"userId":1,"role":"PROVIDER"}	2026-04-06 20:11:21
HW7rgFm33TwUlqHFY1DE3mYBhSW_pDfC	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-06T03:47:10.706Z","secure":false,"httpOnly":true,"path":"/"},"userId":1,"role":"PROVIDER"}	2026-04-06 03:47:16
4qUzSSWWg3IU7X_bcv_LasNAES9tr15c	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-06T04:22:18.800Z","secure":false,"httpOnly":true,"path":"/"},"userId":1,"role":"PROVIDER"}	2026-04-06 04:22:19
ysXSM4sWrrpxbXMlsTS3nxMz_lhEGnHa	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-06T01:01:17.193Z","secure":false,"httpOnly":true,"path":"/"},"userId":1,"role":"PROVIDER"}	2026-04-06 05:51:29
MTPTzDgWUO_ZQVvGjreOU3aPwHwOBPva	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-06T14:05:34.260Z","secure":false,"httpOnly":true,"path":"/"},"userId":7,"role":"ADMIN"}	2026-04-06 14:05:44
Ja4hcRY5ShqZmZWO3LPQWOHHy-JWU4oH	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-07T18:39:02.815Z","secure":false,"httpOnly":true,"path":"/"},"userId":7,"role":"SUPER_ADMIN"}	2026-04-07 22:23:45
ji0whv_fRanPbGSumYGZ2wGHoNoeEl86	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-06T18:07:30.155Z","secure":false,"httpOnly":true,"path":"/"},"userId":1,"role":"PROVIDER"}	2026-04-06 18:07:43
A7mujHEDkrAxHnNsmUahAF0DDIxMKY2M	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-06T16:18:09.834Z","secure":false,"httpOnly":true,"path":"/"},"userId":7,"role":"ADMIN"}	2026-04-06 16:19:10
wNyrhOGK7kZ3FSyBto5mvte1aighV9n9	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-06T05:31:14.394Z","secure":false,"httpOnly":true,"path":"/"},"userId":7,"role":"ADMIN"}	2026-04-06 05:32:22
X6_SVOqOg7HrsPjEyaXnUYN840wQ0-2y	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-06T23:27:41.881Z","secure":false,"httpOnly":true,"path":"/"},"userId":7,"role":"SUPER_ADMIN"}	2026-04-06 23:28:43
Sd84fpXJqK1nnjiUu_JiScXTMnL5VNVi	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-06T03:45:54.918Z","secure":false,"httpOnly":true,"path":"/"},"userId":1,"role":"PROVIDER"}	2026-04-06 03:46:03
X7jJn4anBnC4H53vgJoLCLJ7hMinGo_w	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-06T03:54:06.407Z","secure":false,"httpOnly":true,"path":"/"},"userId":1,"role":"PROVIDER"}	2026-04-06 03:54:08
QSMyLcN429Aw_1VIkMZ5Y5DMwWu_MPKf	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-06T17:29:24.703Z","secure":false,"httpOnly":true,"path":"/"},"userId":7,"role":"SUPER_ADMIN"}	2026-04-06 17:30:12
iaXoj7cZ2Dqgu6IQcdmnWColPB00lat4	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-06T19:14:03.447Z","secure":false,"httpOnly":true,"path":"/"},"userId":7,"role":"SUPER_ADMIN"}	2026-04-06 19:14:16
lCTB4Ph2Ex6C-0zuSNT_Naxe_UD7qaam	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-05T22:34:33.174Z","secure":false,"httpOnly":true,"path":"/"},"userId":1,"role":"PROVIDER"}	2026-04-05 22:34:54
N7pgE57JRIuGkQfNxlSNgxV6-V6Qoqmi	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-06T05:25:00.160Z","secure":false,"httpOnly":true,"path":"/"},"userId":7,"role":"ADMIN"}	2026-04-06 05:26:06
D6Ks8YwTBdzy0FqueLqQh8AVYmznSjyi	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-06T13:34:13.285Z","secure":false,"httpOnly":true,"path":"/"},"userId":7,"role":"ADMIN"}	2026-04-06 13:34:21
UpVgOylYC5xJweC44LtWq9BzcI3k0yPu	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-06T17:32:41.710Z","secure":false,"httpOnly":true,"path":"/"},"userId":7,"role":"SUPER_ADMIN"}	2026-04-06 17:32:49
oQPo7jPXBnkjKmasY2mKi4xP5Sunr2wI	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-07T03:21:26.725Z","secure":false,"httpOnly":true,"path":"/"},"userId":1,"role":"PROVIDER"}	2026-04-07 03:22:12
RYTFrSEnEW279fPWUGhK6h9nyrccBQ0a	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-06T23:16:30.527Z","secure":false,"httpOnly":true,"path":"/"},"userId":7,"role":"SUPER_ADMIN"}	2026-04-06 23:18:57
4D3C_rWpVv5wXEjfgFhR0tLcI_GpcwkO	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-06T16:51:37.053Z","secure":false,"httpOnly":true,"path":"/"},"userId":7,"role":"ADMIN"}	2026-04-06 16:52:29
9UH1Er9orgJgrEMowheazPEz0Y3jPb72	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-05T23:07:42.437Z","secure":false,"httpOnly":true,"path":"/"},"userId":1,"role":"PROVIDER"}	2026-04-05 23:09:13
l6QkljzYWx_NVhSaXfYy4YIsZXKqw9iW	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-06T17:34:29.254Z","secure":false,"httpOnly":true,"path":"/"},"userId":7,"role":"SUPER_ADMIN"}	2026-04-06 17:35:09
bvQrDpV7otS3-irSBOycwhVl0b3Aq6OY	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-06T17:07:54.204Z","secure":false,"httpOnly":true,"path":"/"},"userId":7,"role":"SUPER_ADMIN"}	2026-04-06 17:08:31
ljpCarit-WiXB0rbrfdf0kNylaHNKq9x	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-06T17:17:06.748Z","secure":false,"httpOnly":true,"path":"/"},"userId":7,"role":"SUPER_ADMIN"}	2026-04-06 17:17:36
-eTI1s6ewxz-_AWxSNCbP4MYTXxhRu95	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-06T19:17:28.598Z","secure":false,"httpOnly":true,"path":"/"},"userId":7,"role":"SUPER_ADMIN"}	2026-04-07 04:01:10
6kYhuuiLfO_TnSZ0_eQynma7NCt5lPzW	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-06T18:08:14.440Z","secure":false,"httpOnly":true,"path":"/"},"userId":7,"role":"SUPER_ADMIN"}	2026-04-06 18:08:21
qzA_rZewjoCCGdQYzr2kTCgc3z7Qedqb	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-07T02:43:04.697Z","secure":false,"httpOnly":true,"path":"/"},"userId":1,"role":"PROVIDER"}	2026-04-07 02:43:53
3I8P-pH8FRoqF-5MQ06uVhb7jWLAIYtZ	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-05T22:12:32.497Z","secure":false,"httpOnly":true,"path":"/"},"userId":7,"role":"ADMIN"}	2026-04-05 22:13:08
CJhxGoUl0rXkAzkyy7NzEv-s6UX21Vhx	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-06T05:31:45.025Z","secure":false,"httpOnly":true,"path":"/"},"userId":1,"role":"PROVIDER"}	2026-04-06 05:32:27
5_01pKFNMoA6Zpsd7MCMNwm6mDM65gx3	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-06T18:13:33.073Z","secure":false,"httpOnly":true,"path":"/"},"userId":1,"role":"PROVIDER"}	2026-04-06 18:14:44
rggAWOAvWF45Hydfcv9AG9kKnLsDje8O	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-06T13:55:44.362Z","secure":false,"httpOnly":true,"path":"/"},"userId":7,"role":"ADMIN"}	2026-04-06 14:05:29
gi4N5SsgnGgUNDtk0_v7X82UH-bY2XIj	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-06T00:52:21.092Z","secure":false,"httpOnly":true,"path":"/"},"userId":1,"role":"PROVIDER"}	2026-04-06 00:53:30
3Sk6HsM0e9JGNlZ_QY2N2AjMF-sOuatd	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-06T13:52:59.073Z","secure":false,"httpOnly":true,"path":"/"},"userId":7,"role":"ADMIN"}	2026-04-06 13:54:38
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, password, role, created_at, disclaimer_accepted, status, deleted_at, email_verified, email_verification_token) FROM stdin;
1	alex@gigzito.com	9b45806ffd66976fc3b1e77c56b7d440398319d8cf51b0ae23dad4870b7ae5e2efd315ec1183ea2f4b24f586cffd3bae7b54c2e35e380c1821779a67a7d5ebc5.308a55569d6548fa0b1c078ac1bc2e2d	PROVIDER	2026-03-03 14:52:01.85558	f	active	\N	t	\N
2	maya@gigzito.com	e6b56665823b55ea9994b0ddb21784dc999ceb47bf40d21bb9413afa5c24677f470d98ef91a92afa529edda892abed58a430c00e50aab1f82ab10effa55a41b5.47268c6ba97359546b21e02bd8bcf827	PROVIDER	2026-03-03 14:52:01.907574	f	active	\N	t	\N
3	james@gigzito.com	8c1f74782da599791cc953d58d61c2b569b252cd6f56424529afb1c74378bfd693c732a756e2b430109ddf6166d08588998f448d4d4d9ce5eb1999ef0b67316e.f073c532a9a1fa3665ae4783a6eaa7a2	PROVIDER	2026-03-03 14:52:01.960161	f	active	\N	t	\N
4	sofia@gigzito.com	6fb14fcb1a04521f8c66e9b725096f291db9aec7bde5c887800e08c19590385205922817e78bd9029a207f63128108f4b5c60eb4ab878178a70e0d790072b5eb.910760452222aa2b0131d43ddaf63cc4	PROVIDER	2026-03-03 14:52:02.013747	f	active	\N	t	\N
5	noah@gigzito.com	a1e257317178ed1d0f4090fca2e365a87f31cf36e8a3961c9acd0d26a72c15dc73c75d7673bf98c496b286dd7c44028d6dfb9c7d3379e0e53a8c0ffe43dc741a.36e9472c9a2ca90447ac671e67cf30c1	PROVIDER	2026-03-03 14:52:02.063643	f	active	\N	t	\N
6	priya@gigzito.com	113213f05896658d0185e4249f1b428e602450f47baff1e1831e4ba28bdd3b2bf9f8dfc166d493d9bb57b26748a36e11a1d0212367433ea70ffeec9ee348d049.1a84fe7a2d9722048a4e075e5b34cbd4	PROVIDER	2026-03-03 14:52:02.102266	f	active	\N	t	\N
7	admin@gigzito.com	63b2547a5f570b0354f7736aba46d5661aa404dff229581a39c20e7af6f1b2d325eb421872b935455915dbc62a776dd2a4adba06735ce53c2b9f7fbce63548a7.feecb007a2560f69972c1c9b23d6368e	SUPER_ADMIN	2026-03-03 14:52:02.19184	f	active	\N	t	\N
\.


--
-- Data for Name: video_likes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.video_likes (id, video_id, user_id, created_at) FROM stdin;
3	36	7	2026-03-08 00:18:00.373474
5	37	1	2026-03-08 00:18:30.006538
\.


--
-- Data for Name: video_listings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.video_listings (id, provider_id, vertical, title, video_url, duration_seconds, description, tags, cta_url, status, drop_date, price_paid_cents, stripe_session_id, created_at, updated_at, cta_label, flash_sale_ends_at, coupon_code, product_price, product_purchase_url, product_stock, cta_type, triaged_at, triaged_by, triaged_reason, like_count, reveal_url, reveal_email, reveal_name, collect_email) FROM stdin;
1	1	MARKETING	5 Email Hacks That Tripled My Open Rates	https://www.youtube.com/embed/dQw4w9WgXcQ	18	Learn the exact subject line formulas I use to get 50%+ open rates.	{email,marketing,growth}	https://alexrivera.com/email-course	ACTIVE	2026-03-03	300	\N	2026-03-03 14:52:02.108031	2026-03-03 14:52:02.108031	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	t	f	f	t
2	1	MARKETING	How I Got 10k Instagram Followers in 30 Days	https://www.youtube.com/embed/dQw4w9WgXcQ	20	Organic growth strategies that actually work in 2025.	{instagram,social-media,growth}	https://alexrivera.com/ig-guide	ACTIVE	2026-03-03	300	\N	2026-03-03 14:52:02.110919	2026-03-03 14:52:02.110919	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	t	f	f	t
3	4	MARKETING	SEO in 2025: What's Actually Working	https://www.youtube.com/embed/dQw4w9WgXcQ	19	The three ranking factors that matter most right now.	{seo,google,content}	https://sofiamarketingpro.com	ACTIVE	2026-03-03	300	\N	2026-03-03 14:52:02.113669	2026-03-03 14:52:02.113669	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	t	f	f	t
4	4	MARKETING	Content Strategy for B2B Brands	https://www.youtube.com/embed/dQw4w9WgXcQ	17	Build a content machine that generates leads on autopilot.	{b2b,content,strategy}	\N	ACTIVE	2026-03-03	300	\N	2026-03-03 14:52:02.116266	2026-03-03 14:52:02.116266	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	t	f	f	t
5	6	MARKETING	Facebook Ads That Convert: My Formula	https://www.youtube.com/embed/dQw4w9WgXcQ	20	The ad structure I use to get $0.05 clicks and 8x ROAS.	{facebook-ads,paid-traffic,ecommerce}	\N	ACTIVE	2026-03-03	300	\N	2026-03-03 14:52:02.118964	2026-03-03 14:52:02.118964	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	t	f	f	t
6	2	COACHING	Stop Playing Small: A 10-Minute Exercise	https://www.youtube.com/embed/dQw4w9WgXcQ	14	This quick journaling exercise rewires your subconscious for success.	{mindset,coaching,productivity}	https://mayacoachingco.com	ACTIVE	2026-03-03	300	\N	2026-03-03 14:52:02.121598	2026-03-03 14:52:02.121598	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	t	f	f	t
7	2	COACHING	Work-Life Balance is a Myth — Here's What to Do Instead	https://www.youtube.com/embed/dQw4w9WgXcQ	16	Reframing work-life integration for ambitious founders.	{work-life,burnout,wellness}	\N	ACTIVE	2026-03-03	300	\N	2026-03-03 14:52:02.124558	2026-03-03 14:52:02.124558	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	t	f	f	t
8	5	COACHING	Overcome Imposter Syndrome for Good	https://www.youtube.com/embed/dQw4w9WgXcQ	18	NLP technique to rewire limiting beliefs in under 10 minutes.	{imposter-syndrome,nlp,confidence}	https://noahkimcoach.com/nlp	ACTIVE	2026-03-03	300	\N	2026-03-03 14:52:02.127049	2026-03-03 14:52:02.127049	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	t	f	f	t
9	5	COACHING	Morning Routine of High Performers	https://www.youtube.com/embed/dQw4w9WgXcQ	20	The 5-step morning routine that transformed my productivity.	{morning-routine,habits,performance}	\N	ACTIVE	2026-03-03	300	\N	2026-03-03 14:52:02.129728	2026-03-03 14:52:02.129728	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	t	f	f	t
10	1	COACHING	How to Set Goals You'll Actually Achieve	https://www.youtube.com/embed/dQw4w9WgXcQ	15	The SMART goal framework evolved for modern entrepreneurs.	{goals,planning,entrepreneur}	\N	ACTIVE	2026-03-03	300	\N	2026-03-03 14:52:02.132561	2026-03-03 14:52:02.132561	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	t	f	f	t
11	3	COURSES	Build Your First SaaS in 30 Days	https://www.youtube.com/embed/dQw4w9WgXcQ	19	Step-by-step course: idea to launch with real paying customers.	{saas,startup,coding}	https://jamesokafor.io/saas-course	ACTIVE	2026-03-03	300	\N	2026-03-03 14:52:02.135144	2026-03-03 14:52:02.135144	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	t	f	f	t
12	3	COURSES	Notion Mastery: Build Your Second Brain	https://www.youtube.com/embed/dQw4w9WgXcQ	17	Complete Notion system for creators and entrepreneurs.	{notion,productivity,pkm}	\N	ACTIVE	2026-03-03	300	\N	2026-03-03 14:52:02.137685	2026-03-03 14:52:02.137685	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	t	f	f	t
13	6	COURSES	React & TypeScript: Zero to Hired	https://www.youtube.com/embed/dQw4w9WgXcQ	20	The only React course you need to land a $100k+ dev job.	{react,typescript,webdev}	https://priyateaches.dev/react	ACTIVE	2026-03-03	300	\N	2026-03-03 14:52:02.140361	2026-03-03 14:52:02.140361	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	t	f	f	t
14	6	COURSES	AI Prompt Engineering Masterclass	https://www.youtube.com/embed/dQw4w9WgXcQ	18	Master ChatGPT, Claude, and Gemini to 10x your output.	{ai,chatgpt,prompts}	\N	ACTIVE	2026-03-03	300	\N	2026-03-03 14:52:02.143094	2026-03-03 14:52:02.143094	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	t	f	f	t
15	2	COURSES	The Mindful Leader: Emotional Intelligence Course	https://www.youtube.com/embed/dQw4w9WgXcQ	16	Develop EQ skills that make teams love working with you.	{leadership,eq,management}	\N	ACTIVE	2026-03-03	300	\N	2026-03-03 14:52:02.145891	2026-03-03 14:52:02.145891	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	t	f	f	t
16	4	COURSES	Copywriting Crash Course: Write to Sell	https://www.youtube.com/embed/dQw4w9WgXcQ	14	Persuasive writing frameworks used by 8-figure marketers.	{copywriting,sales,writing}	\N	ACTIVE	2026-03-03	300	\N	2026-03-03 14:52:02.148462	2026-03-03 14:52:02.148462	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	t	f	f	t
17	5	COURSES	Meditation for Busy People: 5-Minute Practice	https://www.youtube.com/embed/dQw4w9WgXcQ	12	Science-backed techniques that fit any schedule.	{meditation,wellness,stress}	\N	ACTIVE	2026-03-03	300	\N	2026-03-03 14:52:02.151127	2026-03-03 14:52:02.151127	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	t	f	f	t
18	3	COURSES	YouTube Growth Formula: 0 to 100k Subs	https://www.youtube.com/embed/dQw4w9WgXcQ	20	Exact system used to grow from 0 to 100k YouTube subscribers.	{youtube,content-creation,growth}	https://jamesokafor.io/yt-course	ACTIVE	2026-03-03	300	\N	2026-03-03 14:52:02.154121	2026-03-03 14:52:02.154121	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	t	f	f	t
34	1	MARKETING	Test Video Title 1772831142748	https://www.youtube.com/embed/dQw4w9WgXcQ	15	\N	{}	\N	ACTIVE	2026-03-06	300	\N	2026-03-06 21:05:48.923135	2026-03-06 21:05:48.923135	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	t	f	f	t
35	34	MARKETING	Admin Test Post	https://www.youtube.com/embed/dQw4w9WgXcQ	15	\N	{}	\N	ACTIVE	2026-03-07	300	\N	2026-03-07 13:54:31.495508	2026-03-07 13:54:31.495508	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	t	f	f	t
38	34	INFLUENCER	Believe in Yourself!	https://youtube.com/shorts/A6xedIgAVxY?si=igTWoCSijVwKEdg4	20	this is a cool video	{}	https://gigzito.com	REMOVED	2026-03-07	300	\N	2026-03-07 20:38:04.75233	2026-03-07 22:51:42.499	\N	\N	\N	\N	\N	\N	Visit Offer	\N	\N	\N	0	t	f	f	t
39	34	COACHING	Believe in yourself!	https://youtube.com/shorts/Zr7qLTbGAsA?si=G85-12SL_dA-8QsW	20	Legendary rev. Ike	{}	https://gigzito.com	TRIAGED	2026-03-07	300	\N	2026-03-07 23:00:22.572579	2026-03-07 23:18:33.596	\N	\N	\N	\N	\N	\N	Visit Offer	2026-03-07 23:18:33.596	7	Non-video format — static image detected	0	t	f	f	t
37	34	MARKETING	Admin Unlimited Test	https://www.youtube.com/embed/dQw4w9WgXcQ	15	\N	{}	\N	ACTIVE	2026-03-07	300	\N	2026-03-07 14:05:43.549783	2026-03-07 14:05:43.549783	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	1	t	f	f	t
36	34	MARKETING	Admin Automated Test Listing	https://www.youtube.com/watch?v=dQw4w9WgXcQ	15	\N	{}	\N	ACTIVE	2026-03-07	300	\N	2026-03-07 13:56:09.541721	2026-03-07 13:56:09.541721	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	1	t	f	f	t
\.


--
-- Data for Name: zito_tv_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.zito_tv_events (id, title, description, host_name, host_user_id, category, live_url, cta_url, cover_image_url, duration_minutes, start_at, end_at, status, created_by, created_at, updated_at) FROM stdin;
1	Live Coaching Q&A Session	\N	Alex Rivera	1	OTHER	\N	\N	\N	60	2026-03-08 14:00:00	2026-03-08 15:00:00	scheduled	1	2026-03-08 03:22:11.253222	2026-03-08 03:22:11.253222
\.


--
-- Name: all_eyes_slots_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.all_eyes_slots_id_seq', 1, true);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 1, false);


--
-- Name: gig_jacks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.gig_jacks_id_seq', 10, true);


--
-- Name: injected_feeds_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.injected_feeds_id_seq', 4, true);


--
-- Name: leads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.leads_id_seq', 2, true);


--
-- Name: live_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.live_sessions_id_seq', 2, true);


--
-- Name: love_votes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.love_votes_id_seq', 1, true);


--
-- Name: mfa_codes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mfa_codes_id_seq', 26, true);


--
-- Name: provider_profiles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.provider_profiles_id_seq', 34, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 33, true);


--
-- Name: video_likes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.video_likes_id_seq', 5, true);


--
-- Name: video_listings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.video_listings_id_seq', 39, true);


--
-- Name: zito_tv_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.zito_tv_events_id_seq', 1, true);


--
-- Name: all_eyes_slots all_eyes_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.all_eyes_slots
    ADD CONSTRAINT all_eyes_slots_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: gig_jacks gig_jacks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gig_jacks
    ADD CONSTRAINT gig_jacks_pkey PRIMARY KEY (id);


--
-- Name: injected_feeds injected_feeds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.injected_feeds
    ADD CONSTRAINT injected_feeds_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: live_sessions live_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_sessions
    ADD CONSTRAINT live_sessions_pkey PRIMARY KEY (id);


--
-- Name: love_votes love_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.love_votes
    ADD CONSTRAINT love_votes_pkey PRIMARY KEY (id);


--
-- Name: love_votes love_votes_voter_user_id_month_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.love_votes
    ADD CONSTRAINT love_votes_voter_user_id_month_key_key UNIQUE (voter_user_id, month_key);


--
-- Name: mfa_codes mfa_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mfa_codes
    ADD CONSTRAINT mfa_codes_pkey PRIMARY KEY (id);


--
-- Name: provider_profiles provider_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_profiles
    ADD CONSTRAINT provider_profiles_pkey PRIMARY KEY (id);


--
-- Name: provider_profiles provider_profiles_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_profiles
    ADD CONSTRAINT provider_profiles_user_id_unique UNIQUE (user_id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: video_likes unique_video_user; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_likes
    ADD CONSTRAINT unique_video_user UNIQUE (video_id, user_id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: video_likes video_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_likes
    ADD CONSTRAINT video_likes_pkey PRIMARY KEY (id);


--
-- Name: video_listings video_listings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_listings
    ADD CONSTRAINT video_listings_pkey PRIMARY KEY (id);


--
-- Name: zito_tv_events zito_tv_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zito_tv_events
    ADD CONSTRAINT zito_tv_events_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_session_expire" ON public.session USING btree (expire);


--
-- Name: idx_all_eyes_slots_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_all_eyes_slots_start ON public.all_eyes_slots USING btree (start_at);


--
-- Name: idx_all_eyes_slots_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_all_eyes_slots_status ON public.all_eyes_slots USING btree (status);


--
-- Name: idx_audit_logs_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_actor ON public.audit_logs USING btree (actor_user_id);


--
-- Name: idx_audit_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_mfa_codes_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mfa_codes_user_id ON public.mfa_codes USING btree (user_id);


--
-- Name: love_votes_provider_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX love_votes_provider_month ON public.love_votes USING btree (provider_id, month_key);


--
-- Name: all_eyes_slots all_eyes_slots_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.all_eyes_slots
    ADD CONSTRAINT all_eyes_slots_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: all_eyes_slots all_eyes_slots_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.all_eyes_slots
    ADD CONSTRAINT all_eyes_slots_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.provider_profiles(id) ON DELETE CASCADE;


--
-- Name: all_eyes_slots all_eyes_slots_video_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.all_eyes_slots
    ADD CONSTRAINT all_eyes_slots_video_listing_id_fkey FOREIGN KEY (video_listing_id) REFERENCES public.video_listings(id) ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: gig_jacks gig_jacks_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gig_jacks
    ADD CONSTRAINT gig_jacks_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.provider_profiles(id) ON DELETE CASCADE;


--
-- Name: injected_feeds injected_feeds_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.injected_feeds
    ADD CONSTRAINT injected_feeds_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: leads leads_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.video_listings(id) ON DELETE CASCADE;


--
-- Name: live_sessions live_sessions_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_sessions
    ADD CONSTRAINT live_sessions_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.provider_profiles(id) ON DELETE CASCADE;


--
-- Name: love_votes love_votes_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.love_votes
    ADD CONSTRAINT love_votes_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.provider_profiles(id) ON DELETE CASCADE;


--
-- Name: love_votes love_votes_voter_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.love_votes
    ADD CONSTRAINT love_votes_voter_user_id_fkey FOREIGN KEY (voter_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: mfa_codes mfa_codes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mfa_codes
    ADD CONSTRAINT mfa_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: provider_profiles provider_profiles_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_profiles
    ADD CONSTRAINT provider_profiles_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: video_likes video_likes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_likes
    ADD CONSTRAINT video_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: video_likes video_likes_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_likes
    ADD CONSTRAINT video_likes_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.video_listings(id) ON DELETE CASCADE;


--
-- Name: video_listings video_listings_provider_id_provider_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_listings
    ADD CONSTRAINT video_listings_provider_id_provider_profiles_id_fk FOREIGN KEY (provider_id) REFERENCES public.provider_profiles(id) ON DELETE CASCADE;


--
-- Name: video_listings video_listings_triaged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_listings
    ADD CONSTRAINT video_listings_triaged_by_fkey FOREIGN KEY (triaged_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: zito_tv_events zito_tv_events_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zito_tv_events
    ADD CONSTRAINT zito_tv_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: zito_tv_events zito_tv_events_host_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zito_tv_events
    ADD CONSTRAINT zito_tv_events_host_user_id_fkey FOREIGN KEY (host_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict blQQ0eXKJdJbI0hwpaw0WOiTVkAw6sbBg2I7kMUvPXmlWBMIXkEwKdNyFKJrRAM

