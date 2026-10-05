import { useEffect, useState } from 'react';
import { ImagePlus, Loader2, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Image } from '@/components/ui/image';

export default function StandingsUpload({ registration, onUploaded }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [signed, setSigned] = useState(null);

  useEffect(() => {
    let active = true;
    const uri = registration?.standings_screenshot;
    if (!uri) {
      setSigned(null);
      return;
    }
    base44.integrations.Core.CreateFileSignedUrl({ file_uri: uri })
      .then((res) => {
        if (active) setSigned((res?.data ?? res)?.signed_url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [registration?.standings_screenshot]);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const up = await base44.integrations.Core.UploadPrivateFile({ file });
      const fileUri = (up?.data ?? up)?.file_uri;
      if (!fileUri) throw new Error('Upload failed');
      const res = await base44.functions.invoke('attachStandingsScreenshot', {
        registration_id: registration.id,
        file_uri: fileUri,
      });
      const data = res?.data ?? res;
      if (data?.error) {
        toast({ title: 'Upload failed', description: data.error, variant: 'destructive' });
      } else {
        toast({ title: 'Standings uploaded' });
        onUploaded?.();
      }
    } catch (err) {
      toast({ title: 'Upload failed', description: err?.message, variant: 'destructive' });
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  };

  return (
    <div className="mt-3 space-y-2">
      {signed ? (
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <Image src={signed} alt="Standings" fittingType="fit" className="h-40 w-full" />
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Played the match? Upload a screenshot of your final standings.
        </p>
      )}
      <label className="glass-soft flex cursor-pointer items-center justify-center gap-2 rounded-2xl py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : signed ? (
          <RefreshCw className="h-4 w-4" />
        ) : (
          <ImagePlus className="h-4 w-4" />
        )}
        {busy ? 'Uploading…' : signed ? 'Replace screenshot' : 'Upload standings'}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
          disabled={busy}
        />
      </label>
    </div>
  );
}