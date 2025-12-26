import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import HomeClient from '@/components/home-client';
import { fetchGoals, fetchNotes } from '@/lib/queries';

export default async function Page() {
  const queryClient = new QueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ['goals'],
      queryFn: fetchGoals,
    }),
    queryClient.prefetchQuery({
      queryKey: ['notes'],
      queryFn: fetchNotes,
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HomeClient />
    </HydrationBoundary>
  );
}
