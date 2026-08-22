'use client'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { Loading } from '@/components/loading'
import { NewRecording } from './components/new-recording'
import { RecordingCard } from './components/recording-card'
import { useRecordings } from './hooks/use-recordings'

export default function RecordingsPage() {
  const {
    recordings,
    isLoading,
    upload,
    uploading,
    pendingDelete,
    askToDelete,
    cancelDelete,
    confirmDelete,
  } = useRecordings()

  if (isLoading) return <Loading />

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <NewRecording upload={upload} uploading={uploading} />

      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink">
          Meus áudios <span className="text-muted">({recordings.length})</span>
        </h2>

        {recordings.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line2 px-4 py-10 text-center text-sm text-muted">
            Nenhum áudio ainda. Grave o primeiro aí em cima.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {recordings.map((recording) => (
              <RecordingCard key={recording.id} recording={recording} onDelete={askToDelete} />
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Excluir esse áudio?"
        description={
          <>
            <strong className="text-ink">{pendingDelete?.title}</strong> some junto com a
            transcrição, o resumo e o PDF. Isso não dá pra desfazer.
          </>
        }
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  )
}
