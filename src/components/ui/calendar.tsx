"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col",
        month: "space-y-4",
        month_caption: "flex justify-center pt-1 relative items-center mb-2 h-9",
        caption_label: "text-white font-semibold text-sm",
        nav: "flex items-center",
        button_previous: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 bg-transparent p-0 text-slate-400 hover:text-white transition absolute left-1 z-20 flex items-center justify-center"
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 bg-transparent p-0 text-slate-400 hover:text-white transition absolute right-1 z-20 flex items-center justify-center"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "grid grid-cols-7 mb-1",
        weekday: "text-slate-400 text-[10px] font-black uppercase tracking-widest text-center h-8 flex items-center justify-center",
        week: "grid grid-cols-7 mt-1",
        day: "text-center p-0",
        day_button: "h-8 w-8 mx-auto flex items-center justify-center rounded-xl text-white text-xs font-bold hover:bg-teal-500/20 transition aria-selected:bg-teal-500 aria-selected:text-white aria-selected:hover:bg-teal-600",
        today: "border border-teal-500/50 text-teal-400 rounded-xl",
        outside: "text-slate-600 opacity-50",
        disabled: "text-slate-700 cursor-not-allowed opacity-30",
        range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("h-5 w-5", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("h-5 w-5", className)} {...props} />
        ),
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
