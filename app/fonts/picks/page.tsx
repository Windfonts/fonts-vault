import { PublicLayout } from "@/components/layout";
import { PicksContent } from "./picks-content";

export const metadata = {
  title: "我的选字 · Windfonts",
};

export default function PicksPage() {
  return (
    <PublicLayout>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-2 text-2xl font-bold">我的选字</h1>
        <p className="text-muted-foreground mb-6 text-sm">
          本地保存（本机浏览器）。可批量复制 CSS 嵌入。
        </p>
        <PicksContent />
      </div>
    </PublicLayout>
  );
}
