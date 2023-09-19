'use client';

import { useEffect, useRef } from 'react';
import { useMap } from '../hooks/useMap';
import useSwr from 'swr';
import { fetcher } from '../utils/http';
import { Route } from '../utils/models';
import { socket } from '../utils/socket-io';
import Grid2 from '@mui/material/Unstable_Grid2/Grid2';
import { Button, NativeSelect, Typography } from '@mui/material';

export function DriverPage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const map = useMap(mapContainerRef);

  const {
    data: routes,
    error,
    isLoading,
  } = useSwr<Route[]>('http://localhost:3001/api/routes', fetcher, {
    fallbackData: [],
  });

  useEffect(() => {
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, []);

  async function startRoute() {
    const routeId = (document.getElementById('route') as HTMLSelectElement)
      .value;
    const response = await fetch(`http://localhost:3001/api/routes/${routeId}`);
    const route: Route = await response.json();
    map?.removeAllRoutes();
    await map?.addRouteWithIcons({
      routeId: routeId,
      startMarkerOptions: {
        position: route.directions.routes[0].legs[0].start_location,
      },
      endMarkerOptions: {
        position: route.directions.routes[0].legs[0].end_location,
      },
      carMarkerOptions: {
        position: route.directions.routes[0].legs[0].start_location,
      },
    });

    const { steps } = route.directions.routes[0].legs[0];

    // Fake car movement
    for (const step of steps) {
      await sleep(2000);
      map?.moveCar(routeId, step.start_location);
      socket.emit('new-points', {
        route_id: routeId,
        lat: step.start_location.lat,
        lng: step.start_location.lng,
      });

      await sleep(2000);
      map?.moveCar(routeId, step.end_location);
      socket.emit('new-points', {
        route_id: routeId,
        lat: step.end_location.lat,
        lng: step.end_location.lng,
      });
    }
  }

  return (
    <Grid2 container sx={{ display: 'flex', flex: 1 }}>
      <Grid2 xs={4} px={2} pt={2}>
        <Typography variant="h4">Minha viagem</Typography>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <NativeSelect id="route" sx={{ mt: 1 }}>
            {isLoading && <option>Carregando...</option>}
            {routes!.map((route) => (
              <option key={route.id} value={route.id}>
                {route.name}
              </option>
            ))}
          </NativeSelect>
          <Button
            variant="contained"
            onClick={startRoute}
            fullWidth
            sx={{ mt: 1 }}
          >
            Iniciar a viagem
          </Button>
        </div>
      </Grid2>
      <Grid2 id="map" xs={8} ref={mapContainerRef}></Grid2>
    </Grid2>
  );
}

export default DriverPage;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
