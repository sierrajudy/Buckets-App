import { GolfCart } from "./GolfCart";

export function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-green-900 flex flex-col items-center justify-center text-green-100 text-sm gap-4">
      <div className="relative w-56 h-14 overflow-hidden">
        <div className="absolute top-0" style={{ animation: "cart-loop 1.6s linear infinite" }}>
          <GolfCart size={64} />
        </div>
      </div>
      <div>{message}</div>
    </div>
  );
}
