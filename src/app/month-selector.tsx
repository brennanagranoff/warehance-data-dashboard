"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MonthSelectorProps {
  currentMonth: string;
}

export function MonthSelector({ currentMonth }: MonthSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [year, month] = currentMonth.split("-").map(Number);
  
  const goToMonth = (newMonth: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", newMonth);
    router.push(`/?${params.toString()}`);
  };
  
  const goToPreviousMonth = () => {
    const prevDate = new Date(year, month - 2, 1);
    goToMonth(prevDate.toISOString().slice(0, 7));
  };
  
  const goToNextMonth = () => {
    const nextDate = new Date(year, month, 1);
    goToMonth(nextDate.toISOString().slice(0, 7));
  };
  
  const goToToday = () => {
    const today = new Date();
    goToMonth(today.toISOString().slice(0, 7));
  };
  
  // Check if we're viewing the current month
  const todayMonth = new Date().toISOString().slice(0, 7);
  const isCurrentMonth = currentMonth === todayMonth;
  
  const monthName = new Date(year, month - 1, 1).toLocaleDateString("en-US", { 
    month: "long", 
    year: "numeric" 
  });
  
  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="min-w-[160px] text-center">
        <h2 className="text-xl font-bold">{monthName}</h2>
      </div>
      <Button variant="outline" size="icon" onClick={goToNextMonth}>
        <ChevronRight className="h-4 w-4" />
      </Button>
      {!isCurrentMonth && (
        <Button variant="outline" size="sm" onClick={goToToday}>
          Today
        </Button>
      )}
    </div>
  );
}



