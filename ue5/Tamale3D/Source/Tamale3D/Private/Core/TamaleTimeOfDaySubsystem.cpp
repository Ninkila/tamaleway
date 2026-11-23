#include "Core/TamaleTimeOfDaySubsystem.h"
#include "EngineUtils.h"
#include "Engine/DirectionalLight.h"
#include "Components/DirectionalLightComponent.h"
#include "Components/ExponentialHeightFogComponent.h"
#include "Tamale3D.h"

void UTamaleTimeOfDaySubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);
    CurrentGameMinutes = 555.0f; // 09:15 AM Tamale morning
    DayCount = 1;
}

TStatId UTamaleTimeOfDaySubsystem::GetStatId() const
{
    RETURN_QUICK_DECLARE_CYCLE_STAT(UTamaleTimeOfDaySubsystem, STATGROUP_Tickables);
}

void UTamaleTimeOfDaySubsystem::Tick(float DeltaTime)
{
    Super::Tick(DeltaTime);
    if (bPaused || SecondsPerGameMinute <= KINDA_SMALL_NUMBER)
    {
        return;
    }

    const float DeltaGameMins = DeltaTime / SecondsPerGameMinute;
    AdvanceMinutes(DeltaGameMins);

    BroadcastAccumulator += DeltaTime;
    if (BroadcastAccumulator >= 0.5f)
    {
        BroadcastAccumulator = 0.0f;
        RotateWorldSunLight();
        OnClockUpdated.Broadcast(CurrentGameMinutes, GetCurrentPeriod());
    }
}

ETamaleTimePeriod UTamaleTimeOfDaySubsystem::GetCurrentPeriod() const
{
    const float Hour = CurrentGameMinutes / 60.0f;
    if (Hour >= 5.5f && Hour < 12.0f) return ETamaleTimePeriod::Morning;
    if (Hour >= 12.0f && Hour < 17.0f) return ETamaleTimePeriod::Afternoon;
    if (Hour >= 17.0f && Hour < 19.5f) return ETamaleTimePeriod::Evening;
    return ETamaleTimePeriod::Night;
}

FString UTamaleTimeOfDaySubsystem::GetFormattedClock() const
{
    const int32 Total = FMath::FloorToInt(FMath::Fmod(CurrentGameMinutes, 1440.0f));
    const int32 Clamped = (Total + 1440) % 1440;
    return FString::Printf(TEXT("%02d:%02d"), Clamped / 60, Clamped % 60);
}

float UTamaleTimeOfDaySubsystem::GetSunPitchDegrees() const
{
    // Sun angle above the eastern horizon: 0 at 06:00, 90 at 12:00, 180 at 18:00, 270 (= -90) at 00:00.
    // (Previous formula returned +90 at noon, i.e. the sun under the ground at midday and overhead at midnight.)
    const float SunAngle = (CurrentGameMinutes / 1440.0f) * 360.0f - 90.0f;
    return FRotator::NormalizeAxis(-SunAngle);
}

float UTamaleTimeOfDaySubsystem::GetDaylightFactor() const
{
    const float SunAngle = (CurrentGameMinutes / 1440.0f) * 360.0f - 90.0f;
    return FMath::Clamp(FMath::Sin(FMath::DegreesToRadians(SunAngle)), 0.0f, 1.0f);
}

float UTamaleTimeOfDaySubsystem::GetWeatherSunMultiplier() const
{
    switch (CurrentWeather)
    {
    case ETamaleWeather::Cloudy:       return 0.55f;
    case ETamaleWeather::Harmattan:    return 0.65f;
    case ETamaleWeather::LightRain:    return 0.45f;
    case ETamaleWeather::Rain:         return 0.3f;
    case ETamaleWeather::Thunderstorm: return 0.2f;
    case ETamaleWeather::Heat:         return 1.1f;
    default:                           return 1.0f;
    }
}

void UTamaleTimeOfDaySubsystem::SetClockAndDay(float InMinutes, int32 InDayCount)
{
    CurrentGameMinutes = FMath::Fmod(InMinutes, 1440.0f);
    if (CurrentGameMinutes < 0.0f) CurrentGameMinutes += 1440.0f;
    DayCount = FMath::Max(1, InDayCount);
    RotateWorldSunLight();
    OnClockUpdated.Broadcast(CurrentGameMinutes, GetCurrentPeriod());
}

int32 UTamaleTimeOfDaySubsystem::AdvanceMinutes(float DeltaMinutes)
{
    if (DeltaMinutes <= 0.0f) return 0;

    const float Total = CurrentGameMinutes + DeltaMinutes;
    const int32 DaysCrossed = FMath::FloorToInt(Total / 1440.0f);
    CurrentGameMinutes = FMath::Fmod(Total, 1440.0f);

    if (DaysCrossed > 0)
    {
        DayCount += DaysCrossed;
        OnDayChanged.Broadcast(DayCount);
    }

    RotateWorldSunLight();
    return DaysCrossed;
}

int32 UTamaleTimeOfDaySubsystem::SleepUntilHour(int32 TargetHour, bool bIsNap, float NapDurationMinutes)
{
    if (bIsNap)
    {
        const int32 Days = AdvanceMinutes(FMath::Max(15.0f, NapDurationMinutes));
        OnClockUpdated.Broadcast(CurrentGameMinutes, GetCurrentPeriod());
        return Days;
    }

    const float TargetMinutes = FMath::Clamp(TargetHour, 0, 23) * 60.0f;
    float Delta = FMath::Fmod(TargetMinutes - CurrentGameMinutes + 1440.0f, 1440.0f);
    if (Delta < 90.0f)
    {
        Delta += 1440.0f;
    }

    const int32 DaysCrossed = AdvanceMinutes(Delta);
    if (DaysCrossed > 0)
    {
        // Gently cycle Tamale savannah weather on overnight wake-up
        static const ETamaleWeather Pool[] = {
            ETamaleWeather::Clear,
            ETamaleWeather::Clear,
            ETamaleWeather::Cloudy,
            ETamaleWeather::Heat,
            ETamaleWeather::Harmattan,
            ETamaleWeather::LightRain
        };
        const int32 Idx = DayCount % UE_ARRAY_COUNT(Pool);
        SetWeather(Pool[Idx]);
    }
    OnClockUpdated.Broadcast(CurrentGameMinutes, GetCurrentPeriod());
    return DaysCrossed;
}

void UTamaleTimeOfDaySubsystem::SetWeather(ETamaleWeather NewWeather)
{
    if (CurrentWeather != NewWeather)
    {
        CurrentWeather = NewWeather;
        ApplyWeatherToWorld();
        RotateWorldSunLight();
        OnWeatherChanged.Broadcast(CurrentWeather);
        UE_LOG(LogTamale3D, Log, TEXT("Weather changed to %s"), *UEnum::GetValueAsString(CurrentWeather));
    }
}

void UTamaleTimeOfDaySubsystem::RotateWorldSunLight()
{
    UWorld* World = GetWorld();
    if (!World) return;

    ADirectionalLight* Sun = CachedSun.Get();
    if (!Sun)
    {
        TActorIterator<ADirectionalLight> It(World);
        if (!It)
        {
            return;
        }
        Sun = *It;
        CachedSun = Sun;
        // A level's default sun is Stationary; it must be Movable to follow the clock.
        if (USceneComponent* Root = Sun->GetRootComponent())
        {
            Root->SetMobility(EComponentMobility::Movable);
        }
    }

    {
        // Yaw 180: light travels east->west in the morning and west->east in the evening.
        Sun->SetActorRotation(FRotator(GetSunPitchDegrees(), 180.0f, 0.0f));
        if (UDirectionalLightComponent* LightComp = Cast<UDirectionalLightComponent>(Sun->GetLightComponent()))
        {
            // UE5 default sun is 10 lux with auto-exposure; scale by daylight and weather.
            const float Day = GetDaylightFactor();
            LightComp->SetIntensity(FMath::Max(0.05f, 10.0f * FMath::Sqrt(Day) * GetWeatherSunMultiplier()));
        }
    }
}

void UTamaleTimeOfDaySubsystem::ApplyWeatherToWorld()
{
    UWorld* World = GetWorld();
    if (!World) return;

    float Density = 0.012f;
    FLinearColor Inscatter(0.75f, 0.62f, 0.45f);
    switch (CurrentWeather)
    {
    case ETamaleWeather::Harmattan:    Density = 0.06f;  Inscatter = FLinearColor(0.85f, 0.68f, 0.45f); break; // dusty haze
    case ETamaleWeather::Heat:         Density = 0.018f; break;
    case ETamaleWeather::Cloudy:       Density = 0.02f;  Inscatter = FLinearColor(0.6f, 0.62f, 0.65f); break;
    case ETamaleWeather::LightRain:    Density = 0.03f;  Inscatter = FLinearColor(0.5f, 0.55f, 0.6f); break;
    case ETamaleWeather::Rain:         Density = 0.045f; Inscatter = FLinearColor(0.42f, 0.46f, 0.52f); break;
    case ETamaleWeather::Thunderstorm: Density = 0.06f;  Inscatter = FLinearColor(0.3f, 0.33f, 0.4f); break;
    default: break;
    }

    for (TActorIterator<AActor> It(World); It; ++It)
    {
        TInlineComponentArray<UExponentialHeightFogComponent*> Fogs(*It);
        for (UExponentialHeightFogComponent* Fog : Fogs)
        {
            Fog->SetFogDensity(Density);
            Fog->SetFogInscatteringColor(Inscatter);
        }
    }
}
