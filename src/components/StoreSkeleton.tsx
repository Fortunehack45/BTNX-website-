import React from "react";

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton-shimmer rounded-sm ${className}`}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col justify-between bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm p-2.5 sm:p-4"
    >
      <div>
        {/* Portrait 3:4 Media Frame */}
        <SkeletonBlock className="aspect-[3/4] w-full mb-2.5 sm:mb-4" />

        {/* Metadata & Copy */}
        <div className="space-y-1.5 sm:space-y-2.5">
          <SkeletonBlock className="h-2.5 sm:h-3 w-28" />

          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1.5 sm:gap-2">
            <SkeletonBlock className="h-4 w-3/4 sm:w-36" />
            <SkeletonBlock className="h-3.5 sm:h-4 w-16 shrink-0" />
          </div>

          <div className="space-y-1.5 pt-0.5">
            <SkeletonBlock className="h-2.5 sm:h-3 w-full" />
            <SkeletonBlock className="h-2.5 sm:h-3 w-4/5" />
          </div>

          <div className="flex items-center gap-1.5 pt-1">
            <span className="w-2.5 h-2.5 rounded-full skeleton-shimmer" />
            <span className="w-2.5 h-2.5 rounded-full skeleton-shimmer" />
            <span className="w-2.5 h-2.5 rounded-full skeleton-shimmer" />
            <SkeletonBlock className="h-2.5 w-16 ml-1" />
          </div>
        </div>
      </div>

      {/* Purchase Controls */}
      <div className="flex flex-col sm:grid sm:grid-cols-2 gap-1.5 sm:gap-2 pt-2.5 sm:pt-4 mt-2.5 sm:mt-4 border-t border-[#E6E2DA] dark:border-[#2C2A26]">
        <SkeletonBlock className="h-[36px] sm:h-[44px] w-full" />
        <SkeletonBlock className="h-[36px] sm:h-[44px] w-full" />
      </div>
    </div>
  );
}

export function PromoCardSkeleton({ featured = false }: { featured?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`border rounded-sm p-6 sm:p-8 flex flex-col justify-between gap-6 ${
        featured
          ? "bg-white dark:bg-[#191816] border-[#966830]/40 dark:border-[#C89B62]/40"
          : "bg-white dark:bg-[#191816] border-[#E6E2DA] dark:border-[#2C2A26]"
      }`}
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <SkeletonBlock className="h-2.5 w-24" />
            <SkeletonBlock className="h-7 w-48" />
          </div>
          <SkeletonBlock className="h-8 w-20 shrink-0" />
        </div>

        <div className="space-y-1.5">
          <SkeletonBlock className="h-3 w-full" />
          <SkeletonBlock className="h-3 w-3/4" />
        </div>

        <SkeletonBlock className="h-12 w-full" />
      </div>

      <div className="pt-4 border-t border-[#E6E2DA] dark:border-[#2C2A26] flex items-center justify-between gap-3">
        <SkeletonBlock className="h-3 w-28" />
        <SkeletonBlock className="h-10 w-36" />
      </div>
    </div>
  );
}

export function NotificationRowSkeleton() {
  return (
    <div aria-hidden="true" className="p-4 sm:p-5 flex items-start gap-3.5">
      <SkeletonBlock className="w-8 h-8 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <SkeletonBlock className="h-3.5 w-40" />
          <SkeletonBlock className="h-2.5 w-10 shrink-0" />
        </div>
        <SkeletonBlock className="h-3 w-full" />
        <SkeletonBlock className="h-3 w-2/3" />
      </div>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <>
      {/* Hero Split Skeleton */}
      <section className="w-full bg-[#FAF9F7] dark:bg-[#111110] border-b border-[#E6E2DA] dark:border-[#2C2A26]">
        <div className="w-full max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-6 py-7 sm:py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-stretch">
            <div className="lg:col-span-5 flex flex-col justify-between gap-7 sm:gap-10 py-1 lg:py-6">
              <div className="flex items-center gap-3">
                <SkeletonBlock className="h-3 w-20" />
                <SkeletonBlock className="h-3 w-36" />
              </div>

              <div className="space-y-5 sm:space-y-6 my-auto">
                <div className="space-y-2.5">
                  <SkeletonBlock className="h-10 sm:h-12 lg:h-14 w-11/12" />
                  <SkeletonBlock className="h-10 sm:h-12 lg:h-14 w-3/4" />
                </div>

                <div className="space-y-2 max-w-md pt-1">
                  <SkeletonBlock className="h-4 w-full" />
                  <SkeletonBlock className="h-4 w-4/5" />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 pt-2">
                  <SkeletonBlock className="h-[48px] w-full sm:w-48" />
                  <SkeletonBlock className="h-5 w-32 mx-auto sm:mx-0" />
                </div>
              </div>

              <div className="pt-6 border-t border-[#E6E2DA] dark:border-[#2C2A26]">
                <SkeletonBlock className="h-3 w-48" />
              </div>
            </div>

            <div className="lg:col-span-7">
              <SkeletonBlock className="h-[360px] sm:h-[490px] lg:h-[600px] w-full" />
            </div>
          </div>

          <div className="mt-8 sm:mt-10 pt-6 sm:pt-7 border-t border-[#E6E2DA] dark:border-[#2C2A26] grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {[0, 1, 2].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <SkeletonBlock className="h-3 w-6" />
                <SkeletonBlock className="h-3 w-44" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* New Arrivals 3-Column Skeleton */}
      <section className="w-full bg-white dark:bg-[#191816] border-b border-[#E6E2DA] dark:border-[#2C2A26]">
        <div className="w-full max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-6 py-16 sm:py-22">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-10 mb-10 border-b border-[#E6E2DA] dark:border-[#2C2A26]">
            <div className="space-y-2.5">
              <SkeletonBlock className="h-3 w-24" />
              <SkeletonBlock className="h-9 sm:h-11 w-56" />
            </div>
            <SkeletonBlock className="h-8 w-full sm:w-80" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
            {[0, 1, 2].map((col) => (
              <div key={col} className="flex flex-col">
                <SkeletonBlock className="aspect-[3/4] w-full mb-5" />
                <div className="flex items-baseline justify-between gap-3">
                  <div className="space-y-2">
                    <SkeletonBlock className="h-3 w-6" />
                    <SkeletonBlock className="h-7 w-40" />
                    <SkeletonBlock className="h-3 w-48" />
                  </div>
                  <SkeletonBlock className="h-4 w-20 shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Seasonal Edition Product Grid Skeleton */}
      <section className="w-full bg-white dark:bg-[#191816] border-b border-[#E6E2DA] dark:border-[#2C2A26]">
        <div className="w-full max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-6 py-14 sm:py-22 space-y-8 sm:space-y-12">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-[#E6E2DA] dark:border-[#2C2A26]">
            <div className="space-y-2.5">
              <SkeletonBlock className="h-3 w-28" />
              <SkeletonBlock className="h-9 sm:h-11 w-64" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full lg:w-auto">
              <SkeletonBlock className="h-[46px] w-full sm:w-96" />
              <SkeletonBlock className="h-3.5 w-16" />
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-7 lg:gap-8">
            {[0, 1, 2, 3, 4, 5].map((card) => (
              <ProductCardSkeleton key={card} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function ShopSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAF9F7] dark:bg-[#111110] pb-20 lg:pb-0">
      <div className="bg-white dark:bg-[#191816] border-b border-[#E6E2DA] dark:border-[#2C2A26]">
        <div className="w-full max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-6 py-8 sm:py-12 lg:py-14">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2.5">
              <SkeletonBlock className="h-3 w-24" />
              <SkeletonBlock className="h-10 sm:h-12 w-60" />
              <SkeletonBlock className="h-4 w-72 sm:w-96" />
            </div>
            <SkeletonBlock className="h-4 w-24" />
          </div>
        </div>
      </div>

      <div className="w-full max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-6 py-5 sm:py-10 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">
          {/* Desktop Left Filter Sidebar Skeleton */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm p-5 space-y-5">
              <SkeletonBlock className="h-3 w-20" />
              <div className="space-y-2">
                {[0, 1, 2, 3, 4, 5].map((row) => (
                  <SkeletonBlock key={row} className="h-[38px] w-full" />
                ))}
              </div>
              <div className="pt-4 border-t border-[#E6E2DA] dark:border-[#2C2A26] space-y-3">
                <SkeletonBlock className="h-3 w-24" />
                <SkeletonBlock className="h-4 w-full" />
                <div className="grid grid-cols-3 gap-1.5">
                  <SkeletonBlock className="h-8 w-full" />
                  <SkeletonBlock className="h-8 w-full" />
                  <SkeletonBlock className="h-8 w-full" />
                </div>
              </div>
            </div>
          </aside>

          {/* Product Grid Column */}
          <div className="lg:col-span-9 space-y-5">
            <div className="grid grid-cols-2 lg:hidden gap-2">
              <SkeletonBlock className="h-[44px] w-full" />
              <SkeletonBlock className="h-[44px] w-full" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6 lg:gap-7">
              {[0, 1, 2, 3, 4, 5].map((card) => (
                <ProductCardSkeleton key={card} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PromosSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAF9F7] dark:bg-[#111110] pb-20 lg:pb-0">
      <div className="bg-white dark:bg-[#191816] border-b border-[#E6E2DA] dark:border-[#2C2A26]">
        <div className="w-full max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-6 py-10 sm:py-14 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-7 space-y-3">
              <SkeletonBlock className="h-3 w-28" />
              <SkeletonBlock className="h-10 sm:h-12 w-4/5" />
              <SkeletonBlock className="h-4 w-full max-w-xl" />
            </div>
            <div className="lg:col-span-5">
              <SkeletonBlock className="h-[46px] w-full" />
            </div>
          </div>
        </div>
      </div>

      <section className="w-full max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-6 py-10 sm:py-14 lg:py-16 space-y-12">
        <div className="space-y-6">
          <div className="flex items-baseline justify-between border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-4">
            <div className="space-y-2">
              <SkeletonBlock className="h-3 w-28" />
              <SkeletonBlock className="h-7 w-52" />
            </div>
            <SkeletonBlock className="h-3 w-16" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PromoCardSkeleton featured />
            <PromoCardSkeleton />
          </div>
        </div>
      </section>
    </div>
  );
}

function SavedSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAF9F7] dark:bg-[#111110] pb-20 lg:pb-0">
      <div className="bg-white dark:bg-[#191816] border-b border-[#E6E2DA] dark:border-[#2C2A26]">
        <div className="w-full max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-6 py-9 sm:py-12 lg:py-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="space-y-2.5">
              <SkeletonBlock className="h-3 w-20" />
              <SkeletonBlock className="h-10 sm:h-12 w-56" />
              <SkeletonBlock className="h-4 w-72 sm:w-96" />
            </div>
            <div className="flex items-center gap-4">
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="h-[42px] w-32" />
            </div>
          </div>
        </div>
      </div>

      <section className="w-full max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-12 lg:py-16">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-7 lg:gap-8">
          {[0, 1, 2].map((card) => (
            <ProductCardSkeleton key={card} />
          ))}
        </div>
      </section>
    </div>
  );
}

function BagSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAF9F7] dark:bg-[#111110] pb-20 lg:pb-0">
      <div className="bg-white dark:bg-[#191816] border-b border-[#E6E2DA] dark:border-[#2C2A26]">
        <div className="w-full max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-6 py-8 sm:py-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <SkeletonBlock className="h-3 w-20" />
              <SkeletonBlock className="h-10 sm:h-12 w-56" />
            </div>
            <SkeletonBlock className="h-4 w-24" />
          </div>
        </div>
      </div>

      <section className="w-full max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-6 py-8 sm:py-12 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <div className="lg:col-span-7 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm divide-y divide-[#E6E2DA] dark:divide-[#2C2A26]">
            {[0, 1].map((row) => (
              <div key={row} className="p-5 sm:p-6 flex gap-4 sm:gap-5">
                <SkeletonBlock className="w-20 h-24 sm:w-24 sm:h-28 shrink-0" />
                <div className="flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between gap-4">
                      <SkeletonBlock className="h-4 w-40" />
                      <SkeletonBlock className="h-4 w-20" />
                    </div>
                    <SkeletonBlock className="h-3 w-28" />
                  </div>
                  <div className="flex items-center justify-between pt-3">
                    <SkeletonBlock className="h-[38px] w-28" />
                    <SkeletonBlock className="h-[38px] w-9" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-5 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm p-6 sm:p-8 space-y-5">
            <SkeletonBlock className="h-6 w-36" />
            <SkeletonBlock className="h-11 w-full" />
            <div className="space-y-2.5 pt-2">
              <div className="flex justify-between">
                <SkeletonBlock className="h-3.5 w-20" />
                <SkeletonBlock className="h-3.5 w-24" />
              </div>
              <div className="flex justify-between">
                <SkeletonBlock className="h-3.5 w-28" />
                <SkeletonBlock className="h-3.5 w-16" />
              </div>
              <div className="flex justify-between pt-3 border-t border-[#E6E2DA] dark:border-[#2C2A26]">
                <SkeletonBlock className="h-5 w-16" />
                <SkeletonBlock className="h-6 w-28" />
              </div>
            </div>
            <SkeletonBlock className="h-12 w-full" />
          </div>
        </div>
      </section>
    </div>
  );
}

function NotificationsSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAF9F7] dark:bg-[#111110] pb-20 lg:pb-0">
      <div className="bg-white dark:bg-[#191816] border-b border-[#E6E2DA] dark:border-[#2C2A26]">
        <div className="w-full max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-6 py-8 sm:py-12">
          <div className="space-y-2.5">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-10 sm:h-12 w-52" />
          </div>
        </div>
      </div>

      <section className="w-full max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-6 py-8 sm:py-12 space-y-6">
        <SkeletonBlock className="h-[44px] w-full sm:w-96" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          <div className="lg:col-span-5 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm divide-y divide-[#E6E2DA] dark:divide-[#2C2A26]">
            {[0, 1, 2, 3].map((row) => (
              <NotificationRowSkeleton key={row} />
            ))}
          </div>
          <div className="hidden lg:block lg:col-span-7 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm p-8 space-y-5">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-8 w-3/4" />
            <div className="space-y-2 pt-2">
              <SkeletonBlock className="h-3.5 w-full" />
              <SkeletonBlock className="h-3.5 w-11/12" />
              <SkeletonBlock className="h-3.5 w-3/4" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProductDetailSkeleton() {
  return (
    <div className="w-full bg-[#FAF9F7] dark:bg-[#111110] pb-20 lg:pb-0">
      <div className="bg-white dark:bg-[#191816] border-b border-[#E6E2DA] dark:border-[#2C2A26]">
        <div className="w-full max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex items-center justify-between gap-4">
          <SkeletonBlock className="h-4 w-48" />
          <SkeletonBlock className="h-3 w-28 hidden sm:block" />
        </div>
      </div>

      <div className="bg-white dark:bg-[#191816] border-b border-[#E6E2DA] dark:border-[#2C2A26]">
        <div className="w-full max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-10 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">
            <div className="lg:col-span-7 space-y-3 sm:space-y-4">
              <SkeletonBlock className="aspect-[4/5] sm:aspect-[3/4] w-full" />
              <div className="grid grid-cols-3 gap-4">
                <SkeletonBlock className="aspect-[3/4] w-full" />
                <SkeletonBlock className="aspect-[3/4] w-full" />
                <SkeletonBlock className="aspect-[3/4] w-full" />
              </div>
            </div>

            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-3 border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-6">
                <div className="flex items-center justify-between">
                  <SkeletonBlock className="h-3 w-36" />
                  <SkeletonBlock className="h-3.5 w-16" />
                </div>
                <SkeletonBlock className="h-10 w-3/4" />
                <div className="flex items-baseline justify-between pt-1">
                  <SkeletonBlock className="h-7 w-32" />
                  <SkeletonBlock className="h-3.5 w-28" />
                </div>
                <div className="space-y-2 pt-2">
                  <SkeletonBlock className="h-3.5 w-full" />
                  <SkeletonBlock className="h-3.5 w-5/6" />
                </div>
              </div>

              <div className="space-y-3">
                <SkeletonBlock className="h-3 w-24" />
                <div className="flex gap-2.5">
                  <SkeletonBlock className="h-[44px] w-28" />
                  <SkeletonBlock className="h-[44px] w-28" />
                  <SkeletonBlock className="h-[44px] w-28" />
                </div>
              </div>

              <div className="space-y-3">
                <SkeletonBlock className="h-3 w-20" />
                <div className="grid grid-cols-4 gap-2">
                  <SkeletonBlock className="h-[44px] w-full" />
                  <SkeletonBlock className="h-[44px] w-full" />
                  <SkeletonBlock className="h-[44px] w-full" />
                  <SkeletonBlock className="h-[44px] w-full" />
                </div>
              </div>

              <div className="space-y-2.5 pt-1">
                <div className="flex gap-3">
                  <SkeletonBlock className="h-[50px] flex-1" />
                  <SkeletonBlock className="h-[50px] w-14 shrink-0" />
                </div>
                <SkeletonBlock className="h-[46px] w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrackSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAF9F7] dark:bg-[#111110] pb-20 lg:pb-16">
      <div className="bg-white dark:bg-[#191816] border-b border-[#E6E2DA] dark:border-[#2C2A26]">
        <div className="w-full max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-6 py-7 sm:py-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-2">
              <SkeletonBlock className="h-3 w-40" />
              <SkeletonBlock className="h-9 w-56" />
            </div>
            <div className="w-full lg:w-[420px]">
              <SkeletonBlock className="h-9 w-full" />
            </div>
          </div>
        </div>
      </div>

      <section className="w-full max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-6 pt-6 sm:pt-10 space-y-5">
        <div className="flex items-center justify-between border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-4">
          <div className="flex gap-6">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="h-4 w-20" />
          </div>
          <SkeletonBlock className="h-3 w-28" />
        </div>

        <div className="bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] divide-y divide-[#E6E2DA] dark:divide-[#2C2A26]">
          {[0, 1, 2].map((row) => (
            <div key={row} className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
              <div className="lg:col-span-4 flex items-center gap-3.5">
                <SkeletonBlock className="w-11 h-14 shrink-0" />
                <div className="space-y-2 flex-1">
                  <SkeletonBlock className="h-3 w-36" />
                  <SkeletonBlock className="h-4 w-48" />
                </div>
              </div>
              <div className="lg:col-span-5 space-y-2">
                <SkeletonBlock className="h-3 w-full" />
                <SkeletonBlock className="h-2 w-full" />
              </div>
              <div className="lg:col-span-3 flex justify-end">
                <SkeletonBlock className="h-8 w-32" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function AppBootSkeleton() {
  const path =
    typeof window !== "undefined" ? window.location.pathname : "/";
  const search =
    typeof window !== "undefined" ? window.location.search : "";
  const params = new URLSearchParams(search);

  let body: React.ReactNode = <HomeSkeleton />;
  if (params.get("product")) body = <ProductDetailSkeleton />;
  else if (path.startsWith("/shop")) body = <ShopSkeleton />;
  else if (path.startsWith("/promos")) body = <PromosSkeleton />;
  else if (path.startsWith("/saved")) body = <SavedSkeleton />;
  else if (path.startsWith("/bag")) body = <BagSkeleton />;
  else if (path.startsWith("/notifications")) body = <NotificationsSkeleton />;
  else if (path.startsWith("/track")) body = <TrackSkeleton />;

  return (
    <div role="status" aria-label="Loading store content">
      {body}
    </div>
  );
}
