import Link from "next/link";

// Registro inexistente o sin permiso, dentro del área con menú (se conserva la navegación).
export default function NotFound() {
  return (
    <div className="card max-w-xl p-6">
      <h1 className="text-xl font-bold">No encontramos lo que buscas</h1>
      <p className="mt-2 text-sm text-text">Puede que se haya eliminado, que el enlace esté incompleto o que tu rol no tenga acceso. Si crees que es un error, avísale a administración.</p>
      <Link href="/" className="btn-ghost mt-5">
        Volver al inicio
      </Link>
    </div>
  );
}
