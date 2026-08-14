create or replace function public.v2_get_public_emergency_profile(p_public_token text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_device public.v2_devices%rowtype;
  v_assignment record;
  v_profile record;
  v_visibility jsonb;
  v_contacts jsonb := '[]'::jsonb;
begin
  select *
    into v_device
  from public.v2_devices
  where public_token = p_public_token
    and status = 'active';

  if not found then
    return null;
  end if;

  select account_id, profile_id
    into v_assignment
  from public.v2_device_assignments
  where device_id = v_device.id
    and ended_at is null
  order by assigned_at desc
  limit 1;

  if v_assignment is null then
    return null;
  end if;

  select id,
         account_id,
         first_name,
         last_name,
         preferred_name,
         blood_type,
         allergies,
         medical_conditions,
         medications,
         medical_notes,
         preferred_hospital,
         visibility
    into v_profile
  from public.v2_profiles
  where id = v_assignment.profile_id
    and account_id = v_assignment.account_id
    and status = 'active';

  if v_profile is null then
    return null;
  end if;

  v_visibility := coalesce(v_profile.visibility, '{}'::jsonb);

  if coalesce((v_visibility->>'contacts')::boolean, true) then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'name', c.name,
          'relationship', c.relationship,
          'phone', c.phone
        )
        order by c.created_at
      ),
      '[]'::jsonb
    )
      into v_contacts
    from public.v2_emergency_contacts c
    where c.account_id = v_assignment.account_id
      and c.status = 'active';
  end if;

  insert into public.v2_scan_events(device_id, account_id, profile_id, emergency_action_taken)
  values (v_device.id, v_assignment.account_id, v_profile.id, false);

  return jsonb_build_object(
    'device', jsonb_build_object(
      'device_number', v_device.device_number,
      'status', v_device.status
    ),
    'profile', jsonb_build_object(
      'display_name',
        case
          when coalesce((v_visibility->>'name')::boolean, true)
            then coalesce(nullif(v_profile.preferred_name, ''), trim(v_profile.first_name || ' ' || v_profile.last_name))
          else 'Persona protegida'
        end,
      'blood_type',
        case when coalesce((v_visibility->>'bloodType')::boolean, true) then v_profile.blood_type else null end,
      'allergies',
        case when coalesce((v_visibility->>'allergies')::boolean, true) then v_profile.allergies else null end,
      'medical_conditions',
        case when coalesce((v_visibility->>'conditions')::boolean, true) then v_profile.medical_conditions else null end,
      'medications',
        case when coalesce((v_visibility->>'medications')::boolean, true) then v_profile.medications else null end,
      'medical_notes',
        case when coalesce((v_visibility->>'medicalNotes')::boolean, false) then v_profile.medical_notes else null end,
      'preferred_hospital',
        case when coalesce((v_visibility->>'hospital')::boolean, true) then v_profile.preferred_hospital else null end
    ),
    'contacts', v_contacts
  );
end;
$function$;

revoke all on function public.v2_get_public_emergency_profile(text) from public;
grant usage on schema public to anon, authenticated;
grant execute on function public.v2_get_public_emergency_profile(text) to anon;
