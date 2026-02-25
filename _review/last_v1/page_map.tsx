import { ProfileKeepAlive } from "@/components/profile-keep-alive";

export default function MapPage() {
  return (
    <>
      <ProfileKeepAlive />
      <div className="flex h-[calc(100vh-3.5rem)] flex-col items-center justify-center p-4">
        <p className="text-center text-muted-foreground">
          Карта с Yandex Maps будет здесь
        </p>
      </div>
    </>
  );
}
