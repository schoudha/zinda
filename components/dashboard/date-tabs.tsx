import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function DateTabs() {
  return (
    <Tabs defaultValue="week" className="w-full">
      <TabsList className="grid w-full grid-cols-3 bg-transparent p-0">
        <TabsTrigger
          value="week"
          className="rounded-full bg-blue-100 font-medium text-blue-700 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:shadow-none"
        >
          Week
        </TabsTrigger>
        <TabsTrigger
          value="month"
          className="rounded-full bg-transparent font-medium text-gray-500 data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900"
        >
          Month
        </TabsTrigger>
        <TabsTrigger
          value="year"
          className="rounded-full bg-transparent font-medium text-gray-500 data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900"
        >
          Year
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

