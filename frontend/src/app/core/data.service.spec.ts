import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DataService, type CreateGuestDto } from './data.service';
import { environment } from 'src/environments/environment';

describe('DataService', () => {
  let svc: DataService;
  let http: HttpTestingController;
  const API = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DataService],
    });
    svc = TestBed.inject(DataService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  /*---------------tests----------------- */
  it('getVenueById -> GET /venues/:id', () => {
    const venueId = 'v1';
    let resp: any;
    svc.getVenueById(venueId).subscribe(r => (resp = r));

    const req = http.expectOne(`${API}/venues/${venueId}`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: venueId, name: 'Hall' });

    expect(resp.id).toBe('v1');
  });

  it('postUserLogin -> POST /users/login with body', () => {
    const body = { email: 'a@b.c', password: 'pw' };
    svc.postUserLogin(body).subscribe();

    const req = http.expectOne(`${API}/users/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ ok: true });
  });

  it('getEmails -> GET /users/emails', () => {
    let emails: string[] = [];
    svc.getEmails().subscribe(e => (emails = e));

    const req = http.expectOne(`${API}/users/emails`);
    expect(req.request.method).toBe('GET');
    req.flush(['one@mail.com', 'two@mail.com']);

    expect(emails.length).toBe(2);
  });

  it('getGuestsByEvent (no filters) -> GET /events/:id/guests', () => {
    const eventId = 'e1';
    svc.getGuestsByEvent(eventId).subscribe();

    const req = http.expectOne(r => r.url === `${API}/events/${eventId}/guests`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().length).toBe(0);
    req.flush([]);
  });

  it('getGuestsByEvent (with filters) sets query params', () => {
    const eventId = 'e2';
    svc.getGuestsByEvent(eventId, { dietary: 'vegan', allergy: 'nuts', rsvp: true }).subscribe();

    const req = http.expectOne(r => r.url === `${API}/events/${eventId}/guests`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('dietary')).toBe('vegan');
    expect(req.request.params.get('allergy')).toBe('nuts');
    expect(req.request.params.get('rsvp')).toBe('true');
    req.flush([]);
  });

  it('getGuestFilterOptions -> GET /events/:id/guest-filters', () => {
    const eventId = 'e3';
    svc.getGuestFilterOptions(eventId).subscribe();

    const req = http.expectOne(`${API}/events/${eventId}/guest-filters`);
    expect(req.request.method).toBe('GET');
    req.flush({ dietary: ['vegan'], allergies: ['nuts'] });
  });

  it('postGuest -> POST /events/:id/guests with body', () => {
    const eventId = 'e4';
    const dto: CreateGuestDto = {
      Name: 'A',
      Email: 'a@b.c',
      Dietary: 'vegan',
      Allergies: 'none',
      RSVPstatus: true,
      Song: 'Track',
    };
    let created: any;
    svc.postGuest(eventId, dto).subscribe(r => (created = r));

    const req = http.expectOne(`${API}/events/${eventId}/guests`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({ id: 'g1', ...dto });

    expect(created.id).toBe('g1');
  });

  it('getWeatherCrossing -> GET /weather-crossing with params', () => {
    svc.getWeatherCrossing('Cape Town', '2025-12-01').subscribe();

    const req = http.expectOne(r => r.url === `${API}/weather-crossing`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('location')).toBe('Cape Town');
    expect(req.request.params.get('date')).toBe('2025-12-01');
    req.flush({ ok: true });
  });

  it('getMapData -> GET /map with address OR lat/lon params', () => {
    // address
    svc.getMapData('221B Baker St').subscribe();
    const req1 = http.expectOne(r => r.url === `${API}/map`);
    expect(req1.request.params.get('address')).toBe('221B Baker St');
    req1.flush({});

    // lat/lon
    svc.getMapData(undefined, -33.9, 18.4).subscribe();
    const req2 = http.expectOne(r => r.url === `${API}/map`);
    expect(req2.request.params.get('lat')).toBe(String(-33.9));
    expect(req2.request.params.get('lon')).toBe(String(18.4));
    req2.flush({});
  });

  it('getNearbyPlaces -> GET /map/nearby with params (default radius=1000)', () => {
    svc.getNearbyPlaces(-33.9, 18.4).subscribe();

    const req = http.expectOne(r => r.url === `${API}/map/nearby`);
    expect(req.request.params.get('lat')).toBe(String(-33.9));
    expect(req.request.params.get('lon')).toBe(String(18.4));
    expect(req.request.params.get('radius')).toBe('1000');
    req.flush({});
  });

  it('deleteGuest -> DELETE /events/:eventId/guests/:guestId', () => {
    svc.deleteGuest('E', 'G').subscribe();

    const req = http.expectOne(`${API}/events/E/guests/G`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'ok', id: 'G' });
  });

  it('downloadGuestsCsv -> GET + responseType: blob', () => {
    svc.downloadGuestsCsv('E', { allergy: 'nuts', dietary: 'vegan', rsvp: false }).subscribe();

    const req = http.expectOne(r => r.url === `${API}/events/E/guests/export.csv`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    expect(req.request.params.get('allergy')).toBe('nuts');
    expect(req.request.params.get('dietary')).toBe('vegan');
    expect(req.request.params.get('rsvp')).toBe('false');
    req.flush(new Blob(['csv']));
  });

  it('downloadGuestsPdf -> GET + responseType: blob', () => {
    svc.downloadGuestsPdf('E', { allergy: 'nuts', dietary: 'vegan', rsvp: false }).subscribe();

    const req = http.expectOne(r => r.url === `${API}/events/E/guests/export.pdf`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    expect(req.request.params.get('allergy')).toBe('nuts');
    expect(req.request.params.get('dietary')).toBe('vegan');
    expect(req.request.params.get('rsvp')).toBe('false');
    req.flush(new Blob(['pdf']));
  });
});
