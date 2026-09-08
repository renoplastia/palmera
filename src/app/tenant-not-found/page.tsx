export default function TenantNotFoundPage({
  searchParams,
}: {
  searchParams?: { slug?: string };
}) {
  const slug = searchParams?.slug || "";
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-stone-200 p-8 shadow-sm text-center space-y-4">
        <div className="mx-auto h-10 w-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 font-black">
          404
        </div>
        <h1 className="text-lg font-black text-stone-900">Instancia no encontrada</h1>
        <p className="text-sm text-stone-600 leading-relaxed">
          {slug ? (
            <>
              No existe ninguna instancia con subdominio <span className="font-mono font-bold text-stone-900">{slug}</span>.
            </>
          ) : (
            <>El subdominio solicitado no corresponde a ninguna instancia registrada.</>
          )}
          {" "}Verifica la URL o contacta al administrador de la plataforma.
        </p>
        <a
          href="/"
          className="inline-flex h-9 items-center justify-center rounded-xl bg-stone-900 text-white px-4 text-xs font-bold"
        >
          Volver al inicio
        </a>
      </div>
    </div>
  );
}
