import {
  middleware,
  createApp,
} from 'sleepy-serv'

const PORT = 3000

middleware.setValidationFormats({
  phone: /^\d{10}$/,
  postalCode: /^\d{5}$/,
  state: /^(([A][ELKSZR])|([C][AOT])|([D][EC])|([F][ML])|([G][AU])|([H][I])|([I][DLNA])|([K][SY])|([L][A])|([M][EHDAINSOT])|([N][EVHJMYCD])|([M][P])|([O][HKR])|([P][WAR])|([R][I])|([S][CD])|([T][NX])|([U][T])|([V][TIA])|([W][AVIY]))$/,
})

const app = await createApp(PORT, import.meta.dirname, {
  // mountPath: '/api',
  middleware: [
    _req => console.info('root-level middleware'),
  ],
  onClose: () => console.info('closing down...'),
})

console.log('routes:', app.routes)
