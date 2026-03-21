import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Music, Upload, Download, Shield, CheckCircle2, AlertTriangle,
  ArrowLeft, Loader2, FileAudio, FileBadge2, Send, Users, Mail,
  Headphones, PartyPopper,
} from "lucide-react";

const ORANGE = "#ff7a00";
const ORANGE_DIM = "#ff7a0015";
const ORANGE_BORDER = "#ff7a0035";

const GENRES = [
  "Hip-Hop", "R&B / Soul", "Pop", "Electronic / EDM", "Afrobeats", "Reggae / Dancehall",
  "Jazz / Fusion", "Gospel / Worship", "Alternative / Indie", "Trap / Drill", "Lo-Fi",
  "Neo-Soul", "Country / Americana", "Latin", "Classical", "Spoken Word / Poetry", "Other",
];

const CERTIFICATE_TEXT = (displayName: string) =>
  `I, "${displayName}", hereby certify under penalty of perjury that I am the original creator, composer, performer, and/or legal master rights holder of this track. I confirm that this content does not infringe upon any third-party copyrights, trademarks, or intellectual property rights. I have full legal authority to distribute this music through GZMusic and the Gigzito platform. I understand that submitting false declarations may result in permanent removal of my content and suspension of my account.`;

type SubmittedTrack = { id: number; title: string; artist: string; genre: string; coverUrl?: string | null; fileUrl?: string | null; downloadEnabled?: boolean };

export default function GZMusicUploadPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const audioRef = useRef<HTMLInputElement>(null);
  const licenseRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const displayName = (user as any)?.profile?.displayName || (user as any)?.user?.email?.split("@")[0] || "Artist";

  // Form state
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState(displayName);
  const [genre, setGenre] = useState("");
  const [downloadEnabled, setDownloadEnabled] = useState(false);
  const [certChecked, setCertChecked] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState("");

  // Success / announce state
  const [submittedTrack, setSubmittedTrack] = useState<SubmittedTrack | null>(null);
  const [singleEmail, setSingleEmail] = useState("");
  const [announceMessage, setAnnounceMessage] = useState("");
  const [sentEmails, setSentEmails] = useState<string[]>([]);
  const [mailingListSent, setMailingListSent] = useState(false);
  const [mailingListCount, setMailingListCount] = useState<number | null>(null);

  // Subscriber count (pre-fetch when page loads)
  const { data: subData } = useQuery<{ count: number }>({
    queryKey: ["/api/gz-music/announce/subscriber-count"],
    enabled: !!user,
    staleTime: 60_000,
  });
  const subscriberCount = subData?.count ?? 0;

  if (!user) {
    navigate("/auth");
    return null;
  }

  // ─── Upload mutation ───────────────────────────────────────────────────────
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!audioFile) throw new Error("Please select an MP3 file to upload.");
      if (!title.trim()) throw new Error("Track title is required.");
      if (!artist.trim()) throw new Error("Artist name is required.");
      if (!genre) throw new Error("Please select a genre.");
      if (!certChecked) throw new Error("You must confirm the certificate of authenticity.");

      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("artist", artist.trim());
      formData.append("genre", genre);
      formData.append("downloadEnabled", String(downloadEnabled));
      formData.append("authenticityConfirmed", "true");
      formData.append("audio", audioFile);
      if (licenseFile) formData.append("license", licenseFile);
      if (coverFile) formData.append("cover", coverFile);

      setUploadProgress("Uploading your track...");
      const res = await fetch("/api/gz-music/submit", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.message || "Upload failed");
      }
      return res.json() as Promise<SubmittedTrack>;
    },
    onSuccess: (track) => {
      queryClient.invalidateQueries({ queryKey: ["/api/gz-music/tracks"] });
      setUploadProgress("");
      setSubmittedTrack(track);
    },
    onError: (err: any) => {
      setUploadProgress("");
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  // ─── Single email announce mutation ───────────────────────────────────────
  const singleMutation = useMutation({
    mutationFn: async () => {
      if (!submittedTrack) throw new Error("No track");
      const res = await fetch("/api/gz-music/announce/single", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId: submittedTrack.id, toEmail: singleEmail.trim(), message: announceMessage }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.message || "Failed to send");
      }
      return res.json();
    },
    onSuccess: () => {
      setSentEmails((prev) => [...prev, singleEmail.trim()]);
      setSingleEmail("");
      toast({ title: "Announced!", description: `Announcement sent to ${singleEmail.trim()}` });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // ─── Mailing list announce mutation ───────────────────────────────────────
  const mailingMutation = useMutation({
    mutationFn: async () => {
      if (!submittedTrack) throw new Error("No track");
      const res = await fetch("/api/gz-music/announce/mailing-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId: submittedTrack.id, message: announceMessage }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.message || "Failed to send");
      }
      return res.json() as Promise<{ sent: number; total: number }>;
    },
    onSuccess: (data) => {
      setMailingListSent(true);
      setMailingListCount(data.sent);
      toast({ title: "Blast sent!", description: `Announced to ${data.sent} subscriber${data.sent !== 1 ? "s" : ""}` });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // ─── File handlers ─────────────────────────────────────────────────────────
  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.includes("audio/") && !f.name.toLowerCase().endsWith(".mp3")) {
      toast({ title: "Invalid file", description: "Please select an MP3 audio file.", variant: "destructive" });
      return;
    }
    if (f.size > 60 * 1024 * 1024) {
      toast({ title: "File too large", description: "MP3 files must be under 60MB.", variant: "destructive" });
      return;
    }
    setAudioFile(f);
  };

  const handleLicenseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "License document must be under 10MB.", variant: "destructive" });
      return;
    }
    setLicenseFile(f);
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setCoverFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setCoverPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const canSubmit = !!audioFile && title.trim() && artist.trim() && genre && certChecked && !uploadMutation.isPending;

  // ─── SUCCESS STATE ─────────────────────────────────────────────────────────
  if (submittedTrack) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 pt-4 pb-28 space-y-5">

          {/* Success banner */}
          <div className="rounded-2xl p-5 text-center space-y-3" style={{ background: "linear-gradient(135deg, #0f1a0a, #0b0b0b)", border: "1px solid #22c55e40" }}>
            <div className="flex items-center justify-center w-14 h-14 rounded-full mx-auto" style={{ background: "#22c55e15", border: "2px solid #22c55e40" }}>
              <PartyPopper className="h-7 w-7" style={{ color: "#22c55e" }} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#22c55e] mb-1">Your Track is Live!</p>
              <h2 className="text-lg font-black text-white">{submittedTrack.title}</h2>
              <p className="text-sm text-[#888]">by {submittedTrack.artist} · {submittedTrack.genre}</p>
            </div>
            {submittedTrack.coverUrl && (
              <img src={submittedTrack.coverUrl} alt="Cover" className="w-24 h-24 rounded-xl object-cover mx-auto border border-[#2a2a2a]" />
            )}
          </div>

          {/* Shared message for both announce options */}
          <div className="rounded-2xl p-5 space-y-3" style={{ background: "#0b0b0b", border: "1px solid #1e1e1e" }}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#555]">Optional Announcement Message</p>
            <Textarea
              value={announceMessage}
              onChange={(e) => setAnnounceMessage(e.target.value)}
              placeholder={`Hey! Just dropped my new track "${submittedTrack.title}" on GZMusic. Go check it out!`}
              rows={3}
              maxLength={600}
              className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#333] text-sm resize-none"
              data-testid="textarea-announce-message"
            />
            <p className="text-[10px] text-[#333] text-right">{announceMessage.length}/600</p>
          </div>

          {/* ANNOUNCE TO SINGLE EMAIL */}
          <div className="rounded-2xl p-5 space-y-4" style={{ background: "#0b0b0b", border: `1px solid ${ORANGE_BORDER}` }}>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" style={{ color: ORANGE }} />
              <div>
                <p className="text-sm font-black text-white">Announce Your Track</p>
                <p className="text-[11px] text-[#555]">Send to any email address — use as many times as you want</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                value={singleEmail}
                onChange={(e) => setSingleEmail(e.target.value)}
                placeholder="recipient@email.com"
                type="email"
                className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#333] h-10 flex-1"
                data-testid="input-announce-email"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && singleEmail.trim() && !singleMutation.isPending) singleMutation.mutate();
                }}
              />
              <button
                onClick={() => singleMutation.mutate()}
                disabled={!singleEmail.trim() || singleMutation.isPending}
                className="flex items-center gap-1.5 px-4 h-10 rounded-xl font-bold text-sm transition-all"
                style={{
                  background: singleEmail.trim() ? `linear-gradient(135deg, ${ORANGE}, #cc5200)` : "#1a1a1a",
                  color: singleEmail.trim() ? "#fff" : "#444",
                  border: "none",
                }}
                data-testid="button-send-single-announce"
              >
                {singleMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send
              </button>
            </div>

            {/* Sent log */}
            {sentEmails.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-[#555] uppercase tracking-widest">Sent to:</p>
                {sentEmails.map((email, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-[#888] px-2 py-1 rounded-lg" style={{ background: "#0f0f0f", border: "1px solid #1e1e1e" }}>
                    <CheckCircle2 className="h-3 w-3 shrink-0" style={{ color: ORANGE }} />
                    {email}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ANNOUNCE TO MAILING LIST */}
          <div className="rounded-2xl p-5 space-y-4" style={{ background: "#0b0b0b", border: "1px solid #1e1e1e" }}>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-400" />
              <div>
                <p className="text-sm font-black text-white">Announce to My Mailing List</p>
                <p className="text-[11px] text-[#555]">
                  {subscriberCount > 0
                    ? `${subscriberCount} subscriber${subscriberCount !== 1 ? "s" : ""} cultivated from your engagement & CTA`
                    : "No subscribers yet — collect emails through your listing CTAs"}
                </p>
              </div>
            </div>

            {mailingListSent ? (
              <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: "#22c55e10", border: "1px solid #22c55e30" }}>
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-400" />
                <div>
                  <p className="text-sm font-bold text-green-400">Blast sent!</p>
                  <p className="text-xs text-[#888]">Announced to {mailingListCount} subscriber{mailingListCount !== 1 ? "s" : ""}</p>
                </div>
              </div>
            ) : (
              <button
                onClick={() => mailingMutation.mutate()}
                disabled={subscriberCount === 0 || mailingMutation.isPending}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-black text-sm transition-all"
                style={{
                  background: subscriberCount > 0 ? "linear-gradient(135deg, #2563eb, #1d4ed8)" : "#1a1a1a",
                  color: subscriberCount > 0 ? "#fff" : "#444",
                  border: "none",
                  boxShadow: subscriberCount > 0 ? "0 4px 20px rgba(37,99,235,0.35)" : "none",
                }}
                data-testid="button-announce-mailing-list"
              >
                {mailingMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                ) : (
                  <><Users className="h-4 w-4" /> Blast to {subscriberCount} Subscriber{subscriberCount !== 1 ? "s" : ""}</>
                )}
              </button>
            )}

            {subscriberCount === 0 && (
              <p className="text-[11px] text-[#444] text-center">
                Enable "Collect Email" on your listings and engage your audience to grow your list.
              </p>
            )}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/gz-music")}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all"
              style={{ background: `linear-gradient(135deg, ${ORANGE}, #cc5200)`, color: "#fff", boxShadow: `0 4px 20px rgba(255,122,0,0.4)` }}
              data-testid="button-view-gz100"
            >
              <Music className="h-4 w-4" /> View on GZ100 Chart
            </button>
            <button
              onClick={() => {
                setSubmittedTrack(null);
                setTitle(""); setArtist(displayName); setGenre("");
                setDownloadEnabled(false); setCertChecked(false);
                setAudioFile(null); setLicenseFile(null); setCoverFile(null);
                setCoverPreview(null); setSentEmails([]); setMailingListSent(false);
              }}
              className="px-4 py-3 rounded-xl font-bold text-sm border transition-all"
              style={{ border: "1px solid #2a2a2a", background: "#0b0b0b", color: "#888" }}
              data-testid="button-upload-another"
            >
              Upload Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── UPLOAD FORM ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 pt-4 pb-28 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/gz-music")}
            className="p-2 rounded-xl border border-[#2a2a2a] bg-[#0b0b0b] text-[#555] hover:text-white hover:border-[#444] transition-colors"
            data-testid="button-back-to-gz-music"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-black text-white">Submit Your Track</h1>
            <p className="text-xs text-[#555]">GZMusic · GZ100 Submission</p>
          </div>
        </div>

        {/* Track Info */}
        <div className="rounded-2xl p-5 space-y-4" style={{ background: "#0b0b0b", border: "1px solid #1e1e1e" }}>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: ORANGE }}>Track Information</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-[#888] mb-1 block">Track Title *</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter your track title" className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#333] h-10" data-testid="input-track-title" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#888] mb-1 block">Artist Name *</label>
              <Input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Your artist/stage name" className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#333] h-10" data-testid="input-track-artist" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#888] mb-1 block">Genre *</label>
              <select value={genre} onChange={(e) => setGenre(e.target.value)} className="w-full h-10 rounded-md px-3 text-sm bg-[#111] border border-[#2a2a2a] text-white" data-testid="select-track-genre">
                <option value="">Select a genre...</option>
                {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Cover Art */}
        <div className="rounded-2xl p-5 space-y-4" style={{ background: "#0b0b0b", border: "1px solid #1e1e1e" }}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#555]">Cover Art <span className="text-[#333] font-normal normal-case">(optional)</span></p>
          <div onClick={() => coverRef.current?.click()} className="relative flex items-center justify-center rounded-xl border-2 border-dashed cursor-pointer transition-colors overflow-hidden" style={{ borderColor: coverPreview ? ORANGE_BORDER : "#2a2a2a", background: "#111", height: coverPreview ? "160px" : "100px" }} data-testid="dropzone-cover">
            {coverPreview ? <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" /> : <div className="flex flex-col items-center gap-2 text-[#333]"><Upload className="h-6 w-6" /><p className="text-xs">Upload cover image</p></div>}
            <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
          </div>
        </div>

        {/* Audio Upload */}
        <div className="rounded-2xl p-5 space-y-4" style={{ background: "#0b0b0b", border: "1px solid #1e1e1e" }}>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: ORANGE }}>Audio File *</p>
          <div onClick={() => audioRef.current?.click()} className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all" style={{ borderColor: audioFile ? ORANGE_BORDER : "#2a2a2a", background: audioFile ? ORANGE_DIM : "#111" }} data-testid="dropzone-audio">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0" style={{ background: audioFile ? ORANGE_DIM : "#1a1a1a", border: `1px solid ${audioFile ? ORANGE_BORDER : "#2a2a2a"}` }}>
              <FileAudio className="h-5 w-5" style={{ color: audioFile ? ORANGE : "#444" }} />
            </div>
            <div className="flex-1 min-w-0">
              {audioFile ? (<><p className="text-sm font-bold text-white truncate">{audioFile.name}</p><p className="text-xs text-[#888]">{(audioFile.size / 1024 / 1024).toFixed(1)} MB</p></>) : (<><p className="text-sm font-semibold text-[#555]">Select MP3 file</p><p className="text-xs text-[#333]">Max 60MB · MP3 format</p></>)}
            </div>
            {audioFile && <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: ORANGE }} />}
            <input ref={audioRef} type="file" accept="audio/mp3,audio/mpeg,.mp3" className="hidden" onChange={handleAudioChange} />
          </div>
        </div>

        {/* License Upload */}
        <div className="rounded-2xl p-5 space-y-4" style={{ background: "#0b0b0b", border: "1px solid #1e1e1e" }}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#555]">Licensing Agreement <span className="text-[#333] font-normal normal-case">(recommended)</span></p>
          <p className="text-xs text-[#333]">Upload your license document (PDF, DOC, or image). Protects your rights and shows listeners terms of use.</p>
          <div onClick={() => licenseRef.current?.click()} className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all" style={{ borderColor: licenseFile ? "#3b82f680" : "#2a2a2a", background: licenseFile ? "#3b82f615" : "#111" }} data-testid="dropzone-license">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0" style={{ background: licenseFile ? "#3b82f620" : "#1a1a1a", border: `1px solid ${licenseFile ? "#3b82f640" : "#2a2a2a"}` }}>
              <FileBadge2 className="h-5 w-5" style={{ color: licenseFile ? "#3b82f6" : "#444" }} />
            </div>
            <div className="flex-1 min-w-0">
              {licenseFile ? (<><p className="text-sm font-bold text-white truncate">{licenseFile.name}</p><p className="text-xs text-[#888]">{(licenseFile.size / 1024 / 1024).toFixed(2)} MB</p></>) : (<><p className="text-sm font-semibold text-[#555]">Upload license document</p><p className="text-xs text-[#333]">PDF, DOC, JPG · Max 10MB</p></>)}
            </div>
            {licenseFile && <CheckCircle2 className="h-5 w-5 shrink-0 text-blue-500" />}
            <input ref={licenseRef} type="file" accept=".pdf,.doc,.docx,.txt,image/*" className="hidden" onChange={handleLicenseChange} />
          </div>
        </div>

        {/* Download Permission */}
        <div className="rounded-2xl p-5 space-y-3" style={{ background: "#0b0b0b", border: "1px solid #1e1e1e" }}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#555]">Download Licensing</p>
          <div className="flex items-start gap-4">
            <button onClick={() => setDownloadEnabled(false)} className="flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-center" style={{ borderColor: !downloadEnabled ? "#ff2b2b80" : "#2a2a2a", background: !downloadEnabled ? "#ff2b2b10" : "#111" }} data-testid="button-download-disabled">
              <Shield className="h-5 w-5" style={{ color: !downloadEnabled ? "#ff2b2b" : "#444" }} />
              <p className="text-xs font-bold" style={{ color: !downloadEnabled ? "#ff2b2b" : "#555" }}>No Download</p>
              <p className="text-[10px] text-[#444] leading-tight">Stream only</p>
            </button>
            <button onClick={() => setDownloadEnabled(true)} className="flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-center" style={{ borderColor: downloadEnabled ? `${ORANGE}80` : "#2a2a2a", background: downloadEnabled ? ORANGE_DIM : "#111" }} data-testid="button-download-enabled">
              <Download className="h-5 w-5" style={{ color: downloadEnabled ? ORANGE : "#444" }} />
              <p className="text-xs font-bold" style={{ color: downloadEnabled ? ORANGE : "#555" }}>Allow Download</p>
              <p className="text-[10px] text-[#444] leading-tight">Listeners may save track</p>
            </button>
          </div>
          {downloadEnabled && (
            <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: `${ORANGE}10`, border: `1px solid ${ORANGE}30` }}>
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: ORANGE }} />
              <p className="text-[11px] text-[#aaa] leading-relaxed">Personal, non-commercial license to save offline. Commercial use and redistribution remain prohibited.</p>
            </div>
          )}
        </div>

        {/* Certificate of Authenticity */}
        <div className="rounded-2xl p-5 space-y-4" style={{ background: certChecked ? "#0f1a0a" : "#0b0b0b", border: `1px solid ${certChecked ? "#22c55e40" : "#1e1e1e"}` }}>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 shrink-0" style={{ color: certChecked ? "#22c55e" : "#555" }} />
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: certChecked ? "#22c55e" : "#555" }}>Certificate of Authenticity</p>
          </div>
          <div className="rounded-xl p-4 text-xs leading-relaxed" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", color: "#888" }}>
            {CERTIFICATE_TEXT(displayName)}
          </div>
          <button onClick={() => setCertChecked((v) => !v)} className="flex items-start gap-3 w-full text-left" data-testid="checkbox-authenticity">
            <div className="mt-0.5 flex items-center justify-center w-5 h-5 rounded border-2 shrink-0 transition-all" style={{ borderColor: certChecked ? "#22c55e" : "#444", background: certChecked ? "#22c55e" : "transparent" }}>
              {certChecked && <CheckCircle2 className="h-3.5 w-3.5 text-black" />}
            </div>
            <p className="text-xs leading-relaxed" style={{ color: certChecked ? "#22c55e" : "#777" }}>
              <strong>I confirm</strong> that I am the original creator and/or master rights holder of this track, and I have the full legal right to distribute it through GZMusic.
            </p>
          </button>
        </div>

        {/* Submit */}
        <div className="space-y-3">
          <Button
            onClick={() => uploadMutation.mutate()}
            disabled={!canSubmit}
            className="w-full h-12 font-black text-base rounded-xl border-none"
            style={{ background: canSubmit ? `linear-gradient(135deg, ${ORANGE}, #cc5200)` : "#1a1a1a", color: canSubmit ? "#fff" : "#444", boxShadow: canSubmit ? `0 4px 20px rgba(255,122,0,0.4)` : "none" }}
            data-testid="button-submit-track"
          >
            {uploadMutation.isPending ? (
              <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{uploadProgress || "Submitting..."}</span>
            ) : (
              <span className="flex items-center gap-2"><Music className="h-4 w-4" />Submit to GZ100</span>
            )}
          </Button>
          {!certChecked && <p className="text-center text-[11px] text-[#444]">Confirm the certificate of authenticity to submit your track.</p>}
          {!audioFile && certChecked && <p className="text-center text-[11px] text-[#444]">Select your MP3 file to submit.</p>}
        </div>
      </div>
    </div>
  );
}
