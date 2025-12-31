<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { getSupabaseClient } from '$lib/supabase/client';
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';

	let { children, data } = $props();
	
	onMount(() => {
		const supabase = getSupabaseClient();
		
		const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
			if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
				invalidateAll();
			}
		});

		return () => {
			subscription.unsubscribe();
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
	<title>YABT - Yet Another Budget Tool</title>
	<meta name="description" content="A zero-based envelope budgeting application to help you take control of your finances.">
</svelte:head>

{@render children()}
