'use client'

import { Search, X } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Loading } from '@/components/loading'
import { NewRecording } from './components/new-recording'
import { RecordingCard } from './components/recording-card'
import { useRecordings } from './hooks/use-recordings'

export default function RecordingsPage() {
  const {
    recordings,
    isLoading,
    search,
    setSearch,
    searching,
    searchPending,
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
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">
            {searching ? 'Resultados' : 'Meus áudios'}{' '}
            <span className="text-muted">({recordings.length})</span>
          </h2>

          {/* Searches the TITLE, o que foi dito e o resumo — daí o placeholder
              prometer isso: uma caixa que só filtrasse títulos não valeria a
              viagem até o servidor. */}
          <label className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search
              size={15}
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar no que foi dito…"
              aria-label="Buscar nos áudios, na transcrição e no resumo"
              className="w-full rounded-lg border border-line2 bg-panel py-2 pl-9 pr-9 text-sm text-ink outline-none transition placeholder:text-muted focus:border-accent"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Limpar a busca"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted transition hover:text-ink"
              >
                <X size={14} aria-hidden />
              </button>
            ) : null}
          </label>
        </div>

        {searchPending ? (
          <Loading compact label="BUSCANDO" />
        ) : recordings.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line2 px-4 py-10 text-center text-sm text-muted">
            {searching
              ? 'Nenhum áudio fala sobre isso — nem no título, nem na transcrição, nem no resumo.'
              : 'Nenhum áudio ainda. Grave o primeiro aí em cima.'}
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
