if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
      console.log('SW Unregistered');
    }
  });
}
caches.keys().then(function(names) {
  for (let name of names) caches.delete(name);
  console.log('Caches cleared');
});
