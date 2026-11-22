#pragma once

#include "CoreMinimal.h"
#include "GameFramework/SaveGame.h"
#include "Data/TamaleWorldTypes.h"
#include "TamaleSaveGame.generated.h"

/**
 * Persists all 6 playable Tamale characters independently so switching
 * characters or reloading never overwrites another character's wallets,
 * inventory, needs, or Changli home state.
 */
UCLASS()
class TAMALE3D_API UTamaleSaveGame : public USaveGame
{
    GENERATED_BODY()

public:
    UPROPERTY(VisibleAnywhere, BlueprintReadWrite, Category = "Save")
    int32 SaveSchemaVersion = 1;

    UPROPERTY(VisibleAnywhere, BlueprintReadWrite, Category = "Save")
    FName ActiveCharacterId = FName(TEXT("yakubu_pragya"));

    UPROPERTY(VisibleAnywhere, BlueprintReadWrite, Category = "Save")
    float GlobalGameMinutes = 555.0f; // 09:15 AM

    UPROPERTY(VisibleAnywhere, BlueprintReadWrite, Category = "Save")
    ETamaleWeather CurrentWeather = ETamaleWeather::Clear;

    UPROPERTY(VisibleAnywhere, BlueprintReadWrite, Category = "Save")
    TMap<FName, FTamaleCharacterSaveState> CharacterStates;
};
