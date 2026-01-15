import { VideoEditor } from '@/components/VideoEditor/VideoEditor';

interface VideoForgeTabProps {
  voiceoverUrl?: string;
  voiceoverBlob?: Blob;
  script: string;
}

export function VideoForgeTab({ voiceoverUrl, voiceoverBlob, script }: VideoForgeTabProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <VideoEditor
        voiceoverUrl={voiceoverUrl}
        voiceoverBlob={voiceoverBlob}
        script={script}
      />
    </div>
  );
}
