#pragma once

#include "CoreMinimal.h"
#include "Engine/GameInstance.h"
#include "Data/TamaleWorldTypes.h"
#include "TamaleGameInstance.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnActiveCharacterSwitched, FName, NewCharacterId);

/**
 * Owns isolated persistent state for all 6 playable Tamale characters,
 * save/load serialization, and clean character switching.
 */
UCLASS()
class TAMALE3D_API UTamaleGameInstance : public UGameInstance
{
    GENERATED_BODY()

public:
    virtual void Init() override;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Save")
    FString DefaultSaveSlotName = TEXT("Tamale3D_SaveSlot01");

    UPROPERTY(BlueprintAssignable, Category = "Character")
    FOnActiveCharacterSwitched OnActiveCharacterSwitched;

    UFUNCTION(BlueprintPure, Category = "Character")
    FName GetActiveCharacterId() const { return ActiveCharacterId; }

    UFUNCTION(BlueprintCallable, Category = "Character")
    FTamaleCharacterSaveState GetActiveCharacterState() const;

    UFUNCTION(BlueprintCallable, Category = "Character")
    void UpdateActiveCharacterState(const FTamaleCharacterSaveState& UpdatedState);

    UFUNCTION(BlueprintCallable, Category = "Character")
    bool SwitchPlayableCharacter(FName NewCharacterId);

    /** All playable character ids in data order (keys 1-6 map to these). */
    UFUNCTION(BlueprintPure, Category = "Character")
    TArray<FName> GetPlayableCharacterIds() const { return CharacterOrder; }

    /** Read-only view of a character's isolated state (nullptr if unknown). */
    const FTamaleCharacterSaveState* FindCharacterState(FName CharacterId) const { return CharacterStates.Find(CharacterId); }

    UFUNCTION(BlueprintCallable, Category = "Save")
    bool SaveCurrentGame(const FString& SlotName = TEXT(""));

    UFUNCTION(BlueprintCallable, Category = "Save")
    bool LoadSavedGame(const FString& SlotName = TEXT(""));

private:
    FName ActiveCharacterId = FName(TEXT("yakubu_pragya"));
    TMap<FName, FTamaleCharacterSaveState> CharacterStates;
    TArray<FName> CharacterOrder;

    void InitializeAllSixPlayableCharacters();

    /** Copies the live player pawn's needs/location into the active character's state. */
    void FlushActivePawnState();
};
