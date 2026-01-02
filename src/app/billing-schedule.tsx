"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Calendar, List, ChevronDown, ChevronUp } from "lucide-react";
import type { DayBilling } from "@/lib/revenue-projections";
import { formatCurrency } from "@/lib/revenue-projections";

interface BillingScheduleProps {
  billingCalendar: DayBilling[];
  month: string;
  projectedTotal: number;
}

type ViewMode = "calendar" | "list";

export function BillingSchedule({ billingCalendar, month, projectedTotal }: BillingScheduleProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  // Parse month
  const [year, monthNum] = month.split("-").map(Number);
  const monthStart = new Date(year, monthNum - 1, 1);
  const monthEnd = new Date(year, monthNum, 0);
  const daysInMonth = monthEnd.getDate();
  const startDayOfWeek = monthStart.getDay();
  const monthName = monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Create a map of day -> billing data
  const billingByDay = new Map<number, DayBilling>();
  for (const billing of billingCalendar) {
    billingByDay.set(billing.dayOfMonth, billing);
  }

  // Calculate totals
  const monthlyTotal = billingCalendar.reduce((sum, d) => sum + d.totalAmount, 0);
  const totalCustomers = billingCalendar.reduce((sum, d) => sum + d.customerCount, 0);

  // Build calendar grid
  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) currentWeek.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === monthNum - 1;
  const todayDay = isCurrentMonth ? today.getDate() : null;

  // Running totals for list view
  let runningTotal = 0;
  const timelineData = billingCalendar.map((day) => {
    runningTotal += day.totalAmount;
    return { ...day, runningTotal, percentOfTotal: (runningTotal / projectedTotal) * 100 };
  });

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle className="text-xl font-bold">{monthName}</CardTitle>
            {/* View Toggle */}
            <div className="flex bg-white/20 rounded-lg p-0.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("calendar")}
                className={`h-7 px-3 ${viewMode === "calendar" ? "bg-white text-emerald-700" : "text-white hover:bg-white/20"}`}
              >
                <Calendar className="h-4 w-4 mr-1" />
                Calendar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("list")}
                className={`h-7 px-3 ${viewMode === "list" ? "bg-white text-emerald-700" : "text-white hover:bg-white/20"}`}
              >
                <List className="h-4 w-4 mr-1" />
                List
              </Button>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{formatCurrency(monthlyTotal)}</div>
            <div className="text-sm opacity-80">{totalCustomers} bills scheduled</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {viewMode === "calendar" ? (
          <CalendarView
            weeks={weeks}
            billingByDay={billingByDay}
            todayDay={todayDay}
            isCurrentMonth={isCurrentMonth}
            expandedDay={expandedDay}
            setExpandedDay={setExpandedDay}
          />
        ) : (
          <ListView
            timelineData={timelineData}
            expandedDay={expandedDay}
            setExpandedDay={setExpandedDay}
          />
        )}
      </CardContent>
    </Card>
  );
}

interface CalendarViewProps {
  weeks: (number | null)[][];
  billingByDay: Map<number, DayBilling>;
  todayDay: number | null;
  isCurrentMonth: boolean;
  expandedDay: string | null;
  setExpandedDay: (day: string | null) => void;
}

function CalendarView({ weeks, billingByDay, todayDay, isCurrentMonth, expandedDay, setExpandedDay }: CalendarViewProps) {
  return (
    <>
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b bg-gray-50">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="py-2 text-center text-xs font-medium text-gray-500 uppercase">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {weeks.map((week, weekIndex) =>
          week.map((day, dayIndex) => {
            if (day === null) {
              return <div key={`empty-${weekIndex}-${dayIndex}`} className="min-h-20 bg-gray-50" />;
            }

            const billing = billingByDay.get(day);
            const isToday = day === todayDay;
            const hasBilling = !!billing;
            const isPast = isCurrentMonth && day < (todayDay || 0);
            const isExpanded = expandedDay === billing?.dateKey;

            return (
              <div
                key={day}
                onClick={() => billing && setExpandedDay(isExpanded ? null : billing.dateKey)}
                className={`
                  min-h-20 border-b border-r p-1.5 transition-colors
                  ${hasBilling ? "cursor-pointer hover:bg-emerald-50" : ""}
                  ${isToday ? "bg-blue-50 ring-2 ring-blue-400 ring-inset" : ""}
                  ${isPast && !isToday ? "bg-gray-50/50" : ""}
                `}
              >
                <div className="flex items-start justify-between">
                  <span className={`
                    text-xs font-medium
                    ${isToday ? "bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]" : ""}
                    ${isPast && !isToday ? "text-gray-400" : ""}
                  `}>
                    {day}
                  </span>
                  {hasBilling && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-emerald-100 text-emerald-700">
                      {billing.customerCount}
                    </Badge>
                  )}
                </div>

                {hasBilling && (
                  <div className="mt-1">
                    <div className="text-xs font-bold text-emerald-700">
                      {formatCurrency(billing.totalAmount)}
                    </div>
                    <div className="text-[10px] text-gray-600 truncate">
                      {billing.customers[0]?.customerName}
                      {billing.customerCount > 1 && ` +${billing.customerCount - 1}`}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Expanded day detail */}
      {expandedDay && (
        <ExpandedDayDetail
          billing={Array.from(billingByDay.values()).find(b => b.dateKey === expandedDay)!}
          onClose={() => setExpandedDay(null)}
        />
      )}
    </>
  );
}

interface ListViewProps {
  timelineData: (DayBilling & { runningTotal: number; percentOfTotal: number })[];
  expandedDay: string | null;
  setExpandedDay: (day: string | null) => void;
}

function ListView({ timelineData, expandedDay, setExpandedDay }: ListViewProps) {
  if (timelineData.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No upcoming bills in this period
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="divide-y">
      {timelineData.map((day) => {
        const isToday = today === day.dateKey;
        const isPast = new Date(day.date) < new Date(today);
        const isExpanded = expandedDay === day.dateKey;

        return (
          <div key={day.dateKey}>
            <div
              onClick={() => setExpandedDay(isExpanded ? null : day.dateKey)}
              className={`
                flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors
                ${isToday ? "bg-blue-50" : "hover:bg-gray-50"}
                ${isPast ? "opacity-60" : ""}
              `}
            >
              {/* Date */}
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                ${isToday ? "bg-blue-600 text-white" : "bg-emerald-100 text-emerald-700"}
              `}>
                {day.dayOfMonth}
              </div>

              {/* Date label */}
              <div className="w-20 flex-shrink-0">
                <div className="text-sm font-medium">
                  {new Date(day.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </div>
              </div>

              {/* Customer info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-muted-foreground truncate">
                  {day.customers.slice(0, 2).map(c => c.customerName).join(", ")}
                  {day.customerCount > 2 && ` +${day.customerCount - 2}`}
                </div>
              </div>

              {/* Amount */}
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-bold text-emerald-700">{formatCurrency(day.totalAmount)}</div>
                <div className="text-[10px] text-muted-foreground">{day.customerCount} customer{day.customerCount !== 1 ? "s" : ""}</div>
              </div>

              {/* Progress */}
              <div className="w-24 flex-shrink-0 hidden sm:flex items-center gap-2">
                <Progress value={day.percentOfTotal} className="h-1.5 flex-1" />
                <span className="text-[10px] text-muted-foreground w-8">{Math.round(day.percentOfTotal)}%</span>
              </div>

              {/* Expand icon */}
              <div className="flex-shrink-0 text-muted-foreground">
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>

            {/* Expanded detail */}
            {isExpanded && (
              <div className="bg-gray-50 border-t px-4 py-3">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {day.customers.map((customer) => (
                    <div key={customer.stripeCustomerId} className="flex items-center justify-between bg-white rounded p-2 text-sm">
                      <span className="truncate">{customer.customerName}</span>
                      <span className="font-medium text-emerald-700 ml-2">{formatCurrency(customer.projectedTotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface ExpandedDayDetailProps {
  billing: DayBilling;
  onClose: () => void;
}

function ExpandedDayDetail({ billing, onClose }: ExpandedDayDetailProps) {
  return (
    <div className="border-t bg-gray-50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold">
          {new Date(billing.date).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric"
          })}
        </h4>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {billing.customers.map((customer) => (
          <div
            key={customer.stripeCustomerId}
            className="flex items-center justify-between bg-white rounded-lg p-3 shadow-sm"
          >
            <div className="truncate pr-2">
              <div className="font-medium truncate">{customer.customerName}</div>
              <div className="text-xs text-gray-500">
                Base: {formatCurrency(customer.baseFee)} + Usage: {formatCurrency(customer.projectedOverage)}
              </div>
            </div>
            <div className="text-lg font-bold text-emerald-700 flex-shrink-0">
              {formatCurrency(customer.projectedTotal)}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t flex justify-between items-center">
        <span className="text-gray-600">Day Total</span>
        <span className="text-xl font-bold text-emerald-700">
          {formatCurrency(billing.totalAmount)}
        </span>
      </div>
    </div>
  );
}



