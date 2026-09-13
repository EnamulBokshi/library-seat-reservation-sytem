import { NoticesView } from "@/components/pages/notices/notices-view";

export const metadata = {
  title: "Notices | Smart Library",
  description: "Announcements from the library, newest and pinned first.",
};

export default function NoticePage() {
  return <NoticesView />;
}
