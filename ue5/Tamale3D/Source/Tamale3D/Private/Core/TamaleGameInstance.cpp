#include "Core/TamaleGameInstance.h"
#include "Core/TamaleSaveGame.h"
#include "Core/TamaleTimeOfDaySubsystem.h"
#include "Data/TamaleDataRegistrySubsystem.h"
#include "Kismet/GameplayStatics.h"
#include "Player/TamalePlayerCharacter.h"
#include "Tamale3D.h"

void UTamaleGameInstance::Init()
{
    Super::Init();
    InitializeAllSixPlayableCharacters();
}

void UTamaleGameInstance::InitializeAllSixPlayableCharacters()
{
    CharacterStates.Empty();
    CharacterOrder.Reset();

    // Preferred source: DT_PlayableCharacters (the same data the web game uses).
    if (const UTamaleDataRegistrySubsystem* Data = GetSubsystem<UTamaleDataRegistrySubsystem>())
    {
        for (const FTamalePlayableCharacterRow& Row : Data->PlayableCharacters)
        {
            FTamaleCharacterSaveState State;
            State.CharacterId = FName(*Row.CharacterId);
            State.DisplayName = Row.DisplayName;
            State.MoneyCedis = Row.StartingMoneyCedis;
            State.BankBalanceCedis = FMath::RoundToInt(Row.StartingMoneyCedis * 1.5f);
            State.Needs.Energy = FMath::Clamp(Row.StartingEnergy, 0.0f, 100.0f);
            State.SavedWorldLocation = FVector(Row.SpawnLocationCm.X, Row.SpawnLocationCm.Y, FMath::Max(100.0, Row.SpawnLocationCm.Z));
            State.HomeState.HomeName = FString::Printf(TEXT("%s's Changli Compound"), *Row.DisplayName);
            State.HomeState.HomeDistrict = Row.HomeDistrict;
            CharacterStates.Add(State.CharacterId, State);
            CharacterOrder.Add(State.CharacterId);
        }
    }

    if (CharacterStates.Num() > 0)
    {
        ActiveCharacterId = CharacterOrder[0];
        UE_LOG(LogTamale3D, Log, TEXT("Seeded %d playable characters from DT_PlayableCharacters"), CharacterOrder.Num());
        return;
    }

    UE_LOG(LogTamale3D, Warning, TEXT("DT_PlayableCharacters not available - using built-in fallback characters"));

    struct FSeedChar
    {
        const TCHAR* Id;
        const TCHAR* Name;
        int32 Money;
        FVector Spawn;
        const TCHAR* HomeName;
    };

    static const FSeedChar Seeds[] = {
        { TEXT("yakubu_pragya"),   TEXT("Yakubu Mohammed"),   180, FVector(2000.0f, 8900.0f, 92.0f), TEXT("Yakubu's Changli Compound") },
        { TEXT("sulemana_moto"),   TEXT("Sulemana Abubakari"),210, FVector(2000.0f, 8900.0f, 92.0f), TEXT("Sulemana's Tishigu Quarters") },
        { TEXT("mariama_trader"),  TEXT("Mariama Alhassan"),  260, FVector(2000.0f, 8900.0f, 92.0f), TEXT("Mariama's Changli Compound") },
        { TEXT("karim_student"),   TEXT("Karim Fuseini"),     130, FVector(2000.0f, 8900.0f, 92.0f), TEXT("Karim's Study Compound") },
        { TEXT("fuseini_artisan"), TEXT("Master Fuseini"),    240, FVector(2000.0f, 8900.0f, 92.0f), TEXT("Master Fuseini's Compound") },
        { TEXT("adiza_chef"),      TEXT("Hajia Adiza"),       220, FVector(2000.0f, 8900.0f, 92.0f), TEXT("Adiza's Kitchen Residence") }
    };

    for (const FSeedChar& S : Seeds)
    {
        FTamaleCharacterSaveState State;
        State.CharacterId = FName(S.Id);
        State.DisplayName = S.Name;
        State.MoneyCedis = S.Money;
        State.BankBalanceCedis = FMath::RoundToInt(S.Money * 1.5f);
        State.SavedWorldLocation = S.Spawn;
        State.HomeState.HomeName = S.HomeName;
        CharacterStates.Add(State.CharacterId, State);
        CharacterOrder.Add(State.CharacterId);
    }

    ActiveCharacterId = FName(TEXT("yakubu_pragya"));
}

FTamaleCharacterSaveState UTamaleGameInstance::GetActiveCharacterState() const
{
    if (const FTamaleCharacterSaveState* Found = CharacterStates.Find(ActiveCharacterId))
    {
        return *Found;
    }
    return FTamaleCharacterSaveState();
}

void UTamaleGameInstance::UpdateActiveCharacterState(const FTamaleCharacterSaveState& UpdatedState)
{
    CharacterStates.Add(ActiveCharacterId, UpdatedState);
}

bool UTamaleGameInstance::SwitchPlayableCharacter(FName NewCharacterId)
{
    if (!CharacterStates.Contains(NewCharacterId))
    {
        UE_LOG(LogTamale3D, Warning, TEXT("Attempted to switch to unknown character ID: %s"), *NewCharacterId.ToString());
        return false;
    }
    if (NewCharacterId == ActiveCharacterId)
    {
        return true;
    }

    // Store the outgoing character's live needs/location first so switching never loses or mixes state.
    FlushActivePawnState();
    UE_LOG(LogTamale3D, Log, TEXT("Switching character %s -> %s"), *ActiveCharacterId.ToString(), *NewCharacterId.ToString());
    ActiveCharacterId = NewCharacterId;
    OnActiveCharacterSwitched.Broadcast(NewCharacterId);
    return true;
}

void UTamaleGameInstance::FlushActivePawnState()
{
    if (APlayerController* PC = GetFirstLocalPlayerController())
    {
        if (ATamalePlayerCharacter* PlayerChar = Cast<ATamalePlayerCharacter>(PC->GetPawn()))
        {
            PlayerChar->SaveToGameInstanceState();
        }
    }
}

bool UTamaleGameInstance::SaveCurrentGame(const FString& SlotName)
{
    const FString TargetSlot = SlotName.IsEmpty() ? DefaultSaveSlotName : SlotName;
    FlushActivePawnState();
    UTamaleSaveGame* SaveObj = Cast<UTamaleSaveGame>(UGameplayStatics::CreateSaveGameObject(UTamaleSaveGame::StaticClass()));
    if (!SaveObj) return false;

    SaveObj->ActiveCharacterId = ActiveCharacterId;
    SaveObj->CharacterStates = CharacterStates;

    if (UWorld* World = GetWorld())
    {
        if (UTamaleTimeOfDaySubsystem* TimeSys = World->GetSubsystem<UTamaleTimeOfDaySubsystem>())
        {
            SaveObj->GlobalGameMinutes = TimeSys->GetGameMinutes();
            SaveObj->GlobalDayCount = TimeSys->GetDayCount();
            SaveObj->CurrentWeather = TimeSys->GetWeather();
        }
    }

    const bool bOk = UGameplayStatics::SaveGameToSlot(SaveObj, TargetSlot, 0);
    UE_LOG(LogTamale3D, Log, TEXT("SaveGameToSlot(%s) -> %s"), *TargetSlot, bOk ? TEXT("SUCCESS") : TEXT("FAILED"));
    return bOk;
}

bool UTamaleGameInstance::LoadSavedGame(const FString& SlotName)
{
    const FString TargetSlot = SlotName.IsEmpty() ? DefaultSaveSlotName : SlotName;
    if (!UGameplayStatics::DoesSaveGameExist(TargetSlot, 0))
    {
        return false;
    }

    UTamaleSaveGame* Loaded = Cast<UTamaleSaveGame>(UGameplayStatics::LoadGameFromSlot(TargetSlot, 0));
    if (!Loaded) return false;

    for (const auto& Pair : Loaded->CharacterStates)
    {
        CharacterStates.Add(Pair.Key, Pair.Value);
    }

    if (CharacterStates.Contains(Loaded->ActiveCharacterId))
    {
        ActiveCharacterId = Loaded->ActiveCharacterId;
    }

    if (UWorld* World = GetWorld())
    {
        if (UTamaleTimeOfDaySubsystem* TimeSys = World->GetSubsystem<UTamaleTimeOfDaySubsystem>())
        {
            // v1 saves kept the day on the character; v2 stores it globally.
            const int32 Day = Loaded->SaveSchemaVersion >= 2 ? Loaded->GlobalDayCount : GetActiveCharacterState().DayCount;
            TimeSys->SetClockAndDay(Loaded->GlobalGameMinutes, Day);
            TimeSys->SetWeather(Loaded->CurrentWeather);
        }
    }

    OnActiveCharacterSwitched.Broadcast(ActiveCharacterId);
    return true;
}
