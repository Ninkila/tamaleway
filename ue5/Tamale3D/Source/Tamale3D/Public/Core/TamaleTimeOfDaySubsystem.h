#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "Data/TamaleWorldTypes.h"
#include "TamaleTimeOfDaySubsystem.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnTamaleDayChanged, int32, NewDayCount);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnTamaleWeatherChanged, ETamaleWeather, NewWeather);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnTamaleClockUpdated, float, CurrentMinutes, ETamaleTimePeriod, Period);

/**
 * Manages Tamale 24-hour clock progression, sun elevation angle, weather transitions,
 * and sleep/wake-up time advancement across the world.
 */
UCLASS()
class TAMALE3D_API UTamaleTimeOfDaySubsystem : public UTickableWorldSubsystem
{
    GENERATED_BODY()

public:
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;
    virtual void Tick(float DeltaTime) override;
    virtual TStatId GetStatId() const override;

    /** Real seconds per 1 in-game minute (default: 0.75s -> 18 min real = 24h game cycle) */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Time")
    float SecondsPerGameMinute = 0.75f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Time")
    bool bPaused = false;

    UFUNCTION(BlueprintPure, Category = "Time")
    float GetGameMinutes() const { return CurrentGameMinutes; }

    UFUNCTION(BlueprintPure, Category = "Time")
    int32 GetDayCount() const { return DayCount; }

    UFUNCTION(BlueprintPure, Category = "Time")
    ETamaleTimePeriod GetCurrentPeriod() const;

    UFUNCTION(BlueprintPure, Category = "Time")
    FString GetFormattedClock() const;

    /** Returns sun pitch angle in degrees suitable for rotating the level DirectionalLight */
    UFUNCTION(BlueprintPure, Category = "Time")
    float GetSunPitchDegrees() const;

    UFUNCTION(BlueprintCallable, Category = "Time")
    void SetClockAndDay(float InMinutes, int32 InDayCount);

    /** Advances time by DeltaMinutes cleanly, triggering midnight/day rollovers if crossed */
    UFUNCTION(BlueprintCallable, Category = "Time")
    int32 AdvanceMinutes(float DeltaMinutes);

    /** Sleeps until the requested morning hour (0..23, e.g. 6 = 06:00 AM) or adds nap minutes */
    UFUNCTION(BlueprintCallable, Category = "Time")
    int32 SleepUntilHour(int32 TargetHour, bool bIsNap = false, float NapDurationMinutes = 90.0f);

    UFUNCTION(BlueprintCallable, Category = "Weather")
    void SetWeather(ETamaleWeather NewWeather);

    UFUNCTION(BlueprintPure, Category = "Weather")
    ETamaleWeather GetWeather() const { return CurrentWeather; }

    UPROPERTY(BlueprintAssignable, Category = "Events")
    FOnTamaleDayChanged OnDayChanged;

    UPROPERTY(BlueprintAssignable, Category = "Events")
    FOnTamaleWeatherChanged OnWeatherChanged;

    UPROPERTY(BlueprintAssignable, Category = "Events")
    FOnTamaleClockUpdated OnClockUpdated;

private:
    float CurrentGameMinutes = 555.0f; // 09:15 AM
    int32 DayCount = 1;
    ETamaleWeather CurrentWeather = ETamaleWeather::Clear;
    float BroadcastAccumulator = 0.0f;

    void RotateWorldSunLight();
};
