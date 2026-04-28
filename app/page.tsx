import PhoneFrame from "@/components/PhoneFrame";
import Chat from "@/components/Chat";

export default function Page() {
  return (
    <main className="app-h w-full">
      <PhoneFrame>
        <Chat />
      </PhoneFrame>
    </main>
  );
}
