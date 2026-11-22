#include "Core/TamaleTimeOfDaySubsystem.h"
#include "EngineUtils.h"
#include "Engine/DirectionalLight.h"
#include "Components/DirectionalLightComponent.h"

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
    // Noon (720 mins) -> high Tamale ~10 deg latitude sun (-76 deg pitch); Midnight -> +65 deg
    const float Normalized = (CurrentGameMinutes / 1440.0f) * 360.0f;
    return -90.0f + Normalized;
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
        OnWeatherChanged.Broadcast(CurrentWeather);
    }
}

void UTamaleTimeOfDaySubsystem::RotateWorldSunLight()
{
    UWorld* World = GetWorld();
    if (!World) return;

    for (TActorIterator<ADirectionalLight> It(World); It; ++It)
    {
        if (ADirectionalLight* Sun = *It)
        {
            const float Pitch = GetSunPitchDegrees();
            Sun->SetActorRotation(FRotator(Pitch, -35.0f, 0.0f));
            if (UDirectionalLightComponent* LightComp = Cast<UDirectionalLightComponent>(Sun->GetLightComponent()))
            {
                const bool bNight = (CurrentGameMinutes < 330.0f || CurrentGameMinutes > 1140.0f);
                LightComp->SetIntensity(bNight ? 0.35f : 5.5f);
            }
            break;
        }
    }
}
