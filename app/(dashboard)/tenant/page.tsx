import { ChatInterface } from "@/app/components/chat/chat-interface";

export default function TenantPage(): React.ReactElement {
    return (
        <div className="flex flex-col h-[calc(100dvh-5rem)] -m-4 -mb-24 md:-m-8 md:-mb-8 overflow-hidden">
            <ChatInterface />
        </div>
    );
}
